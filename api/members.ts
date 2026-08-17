import { authenticate, getServiceRoleClient, requireAdmin, resolveManagerScope } from './_lib/auth.js'
import {
  type ApiRequest,
  type ApiResponse,
  readJsonBody,
  readQueryParam,
  sendError,
  sendJson,
  sendSupabaseError,
} from './_lib/http.js'
import { logInsert, logUpdate } from './_lib/auditLog.js'
import type { Database, MemberStatus } from '../src/types/database'

type MemberRow = Database['public']['Tables']['members']['Row']
type MemberInsert = Database['public']['Tables']['members']['Insert']

// "Incomplete" = missing any of these — used by both ?action=incompleteCount
// and the main list's ?incomplete=true filter, so the definition can't drift
// between the count and the list it's counting.
const INCOMPLETE_MEMBER_OR = [
  'mobile_number.is.null',
  'mobile_number.eq.',
  'address.is.null',
  'address.eq.',
  'father_name.is.null',
  'father_name.eq.',
  'added_by_name.is.null',
  'added_by_name.eq.',
  'reference_contact_name.is.null',
  'reference_contact_name.eq.',
].join(',')

function toMemberRow(values: Partial<MemberInsert>): MemberInsert {
  return {
    member_name: values.member_name ?? '',
    father_name: values.father_name || null,
    mobile_number: values.mobile_number || null,
    address: values.address || null,
    added_by_type: values.added_by_type ?? null,
    added_by_id: values.added_by_type === 'REGISTERED_MEMBER' ? (values.added_by_id ?? null) : null,
    added_by_name: values.added_by_name || null,
    added_by_phone: values.added_by_phone || null,
    reference_contact_type: values.reference_contact_type ?? null,
    reference_contact_id:
      values.reference_contact_type === 'REGISTERED_MEMBER' ? (values.reference_contact_id ?? null) : null,
    reference_contact_name: values.reference_contact_name || null,
    reference_contact_phone: values.reference_contact_phone || null,
    reference_contact_relationship: values.reference_contact_relationship || null,
    assigned_manager_id: values.assigned_manager_id ?? null,
    status: values.status ?? 'ACTIVE',
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  const supabase = getServiceRoleClient()
  const action = readQueryParam(req, 'action')
  const id = readQueryParam(req, 'id')

  try {
    if (req.method === 'GET' && action === 'picker') {
      const search = (readQueryParam(req, 'search') ?? '').trim()
      const limit = Number(readQueryParam(req, 'limit') ?? '10')
      let query = supabase
        .from('members')
        .select('id, member_id, member_name, father_name, mobile_number')
        .eq('status', 'ACTIVE')
        .order('updated_at', { ascending: false })
        .limit(limit)
      const managerScope = resolveManagerScope(profile)
      if (managerScope) query = query.eq('assigned_manager_id', managerScope)
      if (search) query = query.or(`member_name.ilike.%${search}%,member_id.ilike.%${search}%,mobile_number.ilike.%${search}%`)
      const { data, error } = await query
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'GET' && action === 'count') {
      if (!requireAdmin(res, profile)) return
      const managerId = readQueryParam(req, 'managerId')
      if (!managerId) return sendError(res, 400, 'managerId is required.')
      const { count, error } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_manager_id', managerId)
        .eq('status', 'ACTIVE')
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { count: count ?? 0 })
    }

    if (req.method === 'GET' && action === 'unassignedCount') {
      if (!requireAdmin(res, profile)) return
      const { count, error } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .is('assigned_manager_id', null)
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { count: count ?? 0 })
    }

    if (req.method === 'GET' && action === 'incompleteCount') {
      if (!requireAdmin(res, profile)) return
      const { count, error } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ACTIVE')
        .or(INCOMPLETE_MEMBER_OR)
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { count: count ?? 0 })
    }

    if (req.method === 'GET' && action === 'checkIds') {
      if (!requireAdmin(res, profile)) return
      const ids = (readQueryParam(req, 'ids') ?? '').split(',').filter(Boolean)
      if (ids.length === 0) return sendJson(res, 200, { existingIds: [] })
      const { data, error } = await supabase.from('members').select('member_id').in('member_id', ids)
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { existingIds: (data ?? []).map((m) => m.member_id) })
    }

    if (req.method === 'GET' && id) {
      let query = supabase.from('members').select('*').eq('id', id)
      const managerScope = resolveManagerScope(profile)
      if (managerScope) query = query.eq('assigned_manager_id', managerScope)
      const { data, error } = await query.maybeSingle()
      if (error) return sendSupabaseError(res, error)
      if (!data) return sendError(res, 404, 'Member not found.')
      return sendJson(res, 200, data)
    }

    if (req.method === 'GET') {
      const search = readQueryParam(req, 'search')?.trim()
      const status = readQueryParam(req, 'status')
      const page = Number(readQueryParam(req, 'page') ?? '1')
      const pageSize = Number(readQueryParam(req, 'pageSize') ?? '20')
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase.from('members').select('*', { count: 'exact' }).order('updated_at', { ascending: false })
      const managerScope = resolveManagerScope(profile, readQueryParam(req, 'managerId'))
      if (managerScope) query = query.eq('assigned_manager_id', managerScope)
      else if (readQueryParam(req, 'unassigned') === 'true') query = query.is('assigned_manager_id', null)
      if (readQueryParam(req, 'incomplete') === 'true') query = query.or(INCOMPLETE_MEMBER_OR)
      if (status) query = query.eq('status', status as MemberStatus)
      if (search) {
        query = query.or(
          `member_name.ilike.%${search}%,member_id.ilike.%${search}%,mobile_number.ilike.%${search}%,father_name.ilike.%${search}%`,
        )
      }
      const { data, error, count } = await query.range(from, to)
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [], count: count ?? 0 })
    }

    if (req.method === 'POST' && action === 'periodSummaries') {
      const { memberIds, month, year } = await readJsonBody<{ memberIds: string[]; month: number; year: number }>(req)
      if (!Array.isArray(memberIds) || memberIds.length === 0) return sendJson(res, 200, {})

      let scopedIdsQuery = supabase.from('members').select('id').in('id', memberIds)
      const managerScope = resolveManagerScope(profile)
      if (managerScope) scopedIdsQuery = scopedIdsQuery.eq('assigned_manager_id', managerScope)
      const { data: scopedMembers, error: scopeError } = await scopedIdsQuery
      if (scopeError) return sendSupabaseError(res, scopeError)
      const allowedIds = (scopedMembers ?? []).map((m) => m.id)
      if (allowedIds.length === 0) return sendJson(res, 200, {})

      const [donationsResult, followupsResult, pendingResult] = await Promise.all([
        supabase
          .from('donations')
          .select('member_id, amount_inr')
          .in('member_id', allowedIds)
          .eq('donation_month', month)
          .eq('donation_year', year)
          .eq('is_deleted', false),
        supabase
          .from('monthly_followups')
          .select('member_id, follow_up_status')
          .in('member_id', allowedIds)
          .eq('month', month)
          .eq('year', year),
        supabase.rpc('is_pending_followup_batch', { p_member_ids: allowedIds, p_month: month, p_year: year }),
      ])
      if (donationsResult.error) return sendSupabaseError(res, donationsResult.error)
      if (followupsResult.error) return sendSupabaseError(res, followupsResult.error)
      if (pendingResult.error) return sendSupabaseError(res, pendingResult.error)

      const summaries: Record<string, { donationTotal: number; donationCount: number; hasCompletedFollowup: boolean; isPending: boolean }> = {}
      for (const id of allowedIds) {
        summaries[id] = { donationTotal: 0, donationCount: 0, hasCompletedFollowup: false, isPending: false }
      }
      for (const d of donationsResult.data ?? []) {
        // member_id is only nullable for anonymous donations (see
        // supabase/migrations/0013_nullable_donation_member.sql), which can
        // never appear here anyway — the query above filters
        // .in('member_id', allowedIds), and NULL never matches an IN list.
        if (!d.member_id) continue
        summaries[d.member_id].donationTotal += Number(d.amount_inr)
        summaries[d.member_id].donationCount += 1
      }
      for (const f of followupsResult.data ?? []) {
        if (f.follow_up_status === 'COMPLETED') summaries[f.member_id].hasCompletedFollowup = true
      }
      for (const p of pendingResult.data ?? []) {
        if (summaries[p.member_id]) summaries[p.member_id].isPending = p.is_pending
      }
      return sendJson(res, 200, summaries)
    }

    if (req.method === 'POST' && action === 'lastDonationDates') {
      if (!requireAdmin(res, profile)) return
      const { memberIds } = await readJsonBody<{ memberIds: string[] }>(req)
      if (!Array.isArray(memberIds) || memberIds.length === 0) return sendJson(res, 200, {})
      const { data, error } = await supabase.rpc('member_last_donation_dates', { p_member_ids: memberIds })
      if (error) return sendSupabaseError(res, error)
      const dates: Record<string, string | null> = {}
      for (const row of data ?? []) dates[row.member_id] = row.last_donation_date
      return sendJson(res, 200, dates)
    }

    if (req.method === 'POST' && action === 'reassign') {
      if (!requireAdmin(res, profile)) return
      const { memberIds, managerId } = await readJsonBody<{ memberIds: string[]; managerId: string }>(req)
      if (!Array.isArray(memberIds) || memberIds.length === 0 || !managerId) {
        return sendError(res, 400, 'memberIds and managerId are required.')
      }
      const { data: oldRows, error: oldError } = await supabase.from('members').select('*').in('id', memberIds)
      if (oldError) return sendSupabaseError(res, oldError)

      const { data: newRows, error } = await supabase
        .from('members')
        .update({ assigned_manager_id: managerId })
        .in('id', memberIds)
        .select('*')
      if (error) return sendSupabaseError(res, error)

      const oldById = new Map((oldRows ?? []).map((r) => [r.id, r]))
      await Promise.all(
        (newRows ?? []).map((newRow) => {
          const oldRow = oldById.get(newRow.id)
          return oldRow ? logUpdate(supabase, 'members', profile.id, oldRow, newRow) : Promise.resolve()
        }),
      )
      return sendJson(res, 200, { rows: newRows ?? [] })
    }

    if (req.method === 'POST' && action === 'import') {
      if (!requireAdmin(res, profile)) return
      const { rows } = await readJsonBody<{ rows: Partial<MemberInsert>[] }>(req)
      if (!Array.isArray(rows) || rows.length === 0) return sendError(res, 400, 'rows is required.')
      // Unlike create/update (member_id is always system-generated, see
      // src/schemas/member.schema.ts), an import row may already carry a
      // historical member_id from the CSV — preserve it if present; the
      // generate_member_id() trigger only fills it in when it's missing.
      const insertRows = rows.map((row) => ({ ...toMemberRow(row), member_id: row.member_id || undefined }))
      const { data, error } = await supabase.from('members').insert(insertRows).select('*')
      if (error) return sendSupabaseError(res, error)
      await Promise.all((data ?? []).map((row) => logInsert(supabase, 'members', profile.id, row)))
      return sendJson(res, 201, { rows: data ?? [] })
    }

    if (req.method === 'POST') {
      if (!requireAdmin(res, profile)) return
      const values = await readJsonBody<Partial<MemberInsert>>(req)
      const { data, error } = await supabase.from('members').insert(toMemberRow(values)).select('*').single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'members', profile.id, data)
      return sendJson(res, 201, data)
    }

    if (req.method === 'PUT' && id) {
      if (!requireAdmin(res, profile)) return
      const values = await readJsonBody<Partial<MemberInsert>>(req)
      const { data: oldRow, error: oldError } = await supabase.from('members').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Member not found.')

      const { data, error } = await supabase.from('members').update(toMemberRow(values)).eq('id', id).select('*').single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'members', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    if (req.method === 'PATCH' && id && action === 'status') {
      if (!requireAdmin(res, profile)) return
      const { status } = await readJsonBody<{ status: MemberRow['status'] }>(req)
      const { data: oldRow, error: oldError } = await supabase.from('members').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Member not found.')

      const { data, error } = await supabase.from('members').update({ status }).eq('id', id).select('*').single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'members', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/members]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
