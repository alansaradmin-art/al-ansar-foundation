import { authenticate, getServiceRoleClient, requireAdmin, resolveManagerScope, sendForbiddenUnlessManager } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import { logInsert, logUpdate } from './_lib/auditLog.js'
import type { Database, FollowUpStatus } from '../src/types/database'

type FollowupInsert = Database['public']['Tables']['monthly_followups']['Insert']

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  const supabase = getServiceRoleClient()
  const action = readQueryParam(req, 'action')
  const id = readQueryParam(req, 'id')

  try {
    if (req.method === 'GET' && action === 'forMember') {
      const memberId = readQueryParam(req, 'memberId')
      if (!memberId) return sendError(res, 400, 'memberId is required.')

      if (profile.role !== 'ADMIN') {
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('assigned_manager_id')
          .eq('id', memberId)
          .maybeSingle()
        if (memberError) return sendSupabaseError(res, memberError)
        if (!member || member.assigned_manager_id !== profile.managerId) {
          return sendError(res, 404, 'Member not found.')
        }
      }

      const { data, error } = await supabase
        .from('monthly_followups')
        .select('*')
        .eq('member_id', memberId)
        .order('follow_up_date', { ascending: false })
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'GET' && action === 'pending') {
      const month = Number(readQueryParam(req, 'month'))
      const year = Number(readQueryParam(req, 'year'))
      const managerScope = resolveManagerScope(profile, readQueryParam(req, 'managerId'))
      const { data, error } = await supabase.rpc('list_pending_followups', {
        p_manager_id: managerScope ?? null,
        p_month: month,
        p_year: year,
      })
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'GET' && action === 'overdue') {
      if (!requireAdmin(res, profile)) return
      const month = Number(readQueryParam(req, 'month'))
      const year = Number(readQueryParam(req, 'year'))
      const managerScope = resolveManagerScope(profile, readQueryParam(req, 'managerId'))
      const { data, error } = await supabase.rpc('admin_overdue_followups', {
        p_manager_id: managerScope ?? null,
        p_month: month,
        p_year: year,
      })
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'GET') {
      const month = readQueryParam(req, 'month')
      const year = readQueryParam(req, 'year')
      const status = readQueryParam(req, 'status')
      const page = Number(readQueryParam(req, 'page') ?? '1')
      const pageSize = Number(readQueryParam(req, 'pageSize') ?? '25')
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('monthly_followups')
        .select('*, member:members(member_name, member_id, father_name), manager:managers(full_name)', { count: 'exact' })
        .order('follow_up_date', { ascending: false })

      if (month) query = query.eq('month', Number(month))
      if (year) query = query.eq('year', Number(year))
      if (status) query = query.eq('follow_up_status', status as FollowUpStatus)

      const managerScope = resolveManagerScope(profile, readQueryParam(req, 'managerId'))
      if (managerScope) query = query.eq('manager_id', managerScope)

      const { data, error, count } = await query.range(from, to)
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [], count: count ?? 0 })
    }

    if (req.method === 'POST') {
      // Every real call site (AddFollowupDialog) is manager-only — there is
      // no admin "add follow-up" UI path today, so this is a deliberate,
      // safe narrowing rather than a straight port of the old RLS policy
      // (which technically also permitted an unrestricted admin branch that
      // nothing ever exercised).
      if (!sendForbiddenUnlessManager(res, profile)) return
      const values = await readJsonBody<Partial<FollowupInsert> & { follow_up_date: string; confirmDuplicate?: boolean }>(req)
      if (!values.member_id) return sendError(res, 400, 'member_id is required.')

      // Authoritative check — the client can't be trusted to enforce this,
      // and the server can't rely on any particular caller's own clock, so
      // "today" is computed explicitly in this foundation's timezone rather
      // than the server process's own (Vercel runs functions in UTC).
      const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      if (values.follow_up_date > todayIST) {
        return sendError(res, 400, 'Follow-up date cannot be in the future.')
      }

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('assigned_manager_id')
        .eq('id', values.member_id)
        .maybeSingle()
      if (memberError) return sendSupabaseError(res, memberError)
      if (!member || member.assigned_manager_id !== profile.managerId) {
        return sendError(res, 403, 'You can only add follow-ups for your own members.')
      }

      // Soft duplicate check — a warning, not a block. Deliberately keyed
      // on status too, not just date: the request explicitly allows
      // multiple genuinely separate attempts on the same day (e.g. no
      // answer, then reached them later) — only re-logging the *same*
      // status for a date that already has one is flagged. manager_id
      // isn't part of the match: a member has exactly one assigned
      // manager, already enforced above, so it's redundant here.
      if (!values.confirmDuplicate) {
        const { data: existingFollowup, error: dupError } = await supabase
          .from('monthly_followups')
          .select('*')
          .eq('member_id', values.member_id)
          .eq('follow_up_date', values.follow_up_date)
          .eq('follow_up_status', values.follow_up_status!)
          .maybeSingle()
        if (dupError) return sendSupabaseError(res, dupError)
        if (existingFollowup) {
          return sendJson(res, 409, {
            error: {
              message: 'A follow-up for this member on this date with this status is already recorded.',
              code: 'POSSIBLE_DUPLICATE',
            },
            existing: existingFollowup,
          })
        }
      }

      const [year, month] = values.follow_up_date.split('-').map(Number)
      const { data, error } = await supabase
        .from('monthly_followups')
        .insert({
          member_id: values.member_id,
          // Always the caller's own manager id/profile id — never trust a
          // client-supplied manager_id/created_by.
          manager_id: profile.managerId!,
          month,
          year,
          follow_up_date: values.follow_up_date,
          follow_up_status: values.follow_up_status!,
          follow_up_method: values.follow_up_method ?? null,
          contacted_person_type: values.contacted_person_type ?? null,
          contacted_person_name: values.contacted_person_name || null,
          contacted_person_phone: values.contacted_person_phone || null,
          contacted_person_relationship: values.contacted_person_relationship || null,
          remarks: values.remarks || null,
          next_follow_up_date: values.next_follow_up_date || null,
          created_by: profile.id,
        })
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'monthly_followups', profile.id, data)
      return sendJson(res, 201, data)
    }

    if (req.method === 'PATCH' && id && action === 'update') {
      // Same manager-only rule as create — there is still no admin
      // follow-up path.
      if (!sendForbiddenUnlessManager(res, profile)) return

      const { data: oldRow, error: oldError } = await supabase.from('monthly_followups').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Follow-up not found.')

      // Only an open attempt can be continued — a finished outcome
      // (COMPLETED/NOT_INTERESTED/CALLBACK_REQUIRED/OTHER) stays immutable,
      // same as every other follow-up today; logging a new one is still
      // the only way to record another attempt after this point.
      if (oldRow.follow_up_status !== 'STARTED' && oldRow.follow_up_status !== 'IN_PROGRESS') {
        return sendError(res, 400, 'Only a Started or In Progress follow-up can be updated.')
      }

      // Re-checks the member's CURRENT manager, not the row's stored
      // manager_id — a follow-up logged before a reassignment isn't
      // editable by a manager who no longer owns this member.
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('assigned_manager_id')
        .eq('id', oldRow.member_id)
        .maybeSingle()
      if (memberError) return sendSupabaseError(res, memberError)
      if (!member || member.assigned_manager_id !== profile.managerId) {
        return sendError(res, 403, 'You can only update follow-ups for your own members.')
      }

      const values = await readJsonBody<Partial<FollowupInsert> & { confirmDuplicate?: boolean }>(req)

      // follow_up_date/month/year are never taken from the client here —
      // "update" continues the same attempt, it never moves it to a
      // different period. Only donations.ts's ?action=update allows a date
      // change; that's a deliberately different rule for a different
      // entity.
      if (!values.confirmDuplicate) {
        const { data: existingFollowup, error: dupError } = await supabase
          .from('monthly_followups')
          .select('*')
          .eq('member_id', oldRow.member_id)
          .eq('follow_up_date', oldRow.follow_up_date)
          .eq('follow_up_status', values.follow_up_status!)
          .neq('id', id)
          .maybeSingle()
        if (dupError) return sendSupabaseError(res, dupError)
        if (existingFollowup) {
          return sendJson(res, 409, {
            error: {
              message: 'A follow-up for this member on this date with this status is already recorded.',
              code: 'POSSIBLE_DUPLICATE',
            },
            existing: existingFollowup,
          })
        }
      }

      const { data, error } = await supabase
        .from('monthly_followups')
        .update({
          follow_up_status: values.follow_up_status!,
          follow_up_method: values.follow_up_method ?? null,
          contacted_person_type: values.contacted_person_type ?? null,
          contacted_person_name: values.contacted_person_name || null,
          contacted_person_phone: values.contacted_person_phone || null,
          contacted_person_relationship: values.contacted_person_relationship || null,
          remarks: values.remarks || null,
          next_follow_up_date: values.next_follow_up_date || null,
          // follow_up_date, month, year, member_id, manager_id, created_by
          // are intentionally absent — never taken from the client payload.
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'monthly_followups', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/followups]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
