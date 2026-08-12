import { authenticate, getServiceRoleClient, resolveManagerScope, sendForbiddenUnlessManager } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import { logInsert } from './_lib/auditLog.js'
import type { Database, FollowUpStatus } from '../src/types/database'

type FollowupInsert = Database['public']['Tables']['monthly_followups']['Insert']

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  const supabase = getServiceRoleClient()
  const action = readQueryParam(req, 'action')

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
      const values = await readJsonBody<Partial<FollowupInsert> & { follow_up_date: string }>(req)
      if (!values.member_id) return sendError(res, 400, 'member_id is required.')

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('assigned_manager_id')
        .eq('id', values.member_id)
        .maybeSingle()
      if (memberError) return sendSupabaseError(res, memberError)
      if (!member || member.assigned_manager_id !== profile.managerId) {
        return sendError(res, 403, 'You can only add follow-ups for your own members.')
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
          created_by: profile.id,
        })
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'monthly_followups', profile.id, data)
      return sendJson(res, 201, data)
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/followups]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
