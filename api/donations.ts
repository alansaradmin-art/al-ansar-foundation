import { authenticate, getServiceRoleClient, requireAdmin, resolveManagerScope } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import { logInsert, logUpdate } from './_lib/auditLog.js'
import type { Database, PaymentMethod } from '../src/types/database'

type DonationInsert = Database['public']['Tables']['donations']['Insert']

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
        .from('donations')
        .select('*')
        .eq('member_id', memberId)
        .eq('is_deleted', false)
        .order('donation_date', { ascending: false })
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'GET') {
      const month = readQueryParam(req, 'month')
      const year = readQueryParam(req, 'year')
      const memberId = readQueryParam(req, 'memberId')
      const paymentMethod = readQueryParam(req, 'paymentMethod')
      const dateFrom = readQueryParam(req, 'dateFrom')
      const dateTo = readQueryParam(req, 'dateTo')
      const page = Number(readQueryParam(req, 'page') ?? '1')
      const pageSize = Number(readQueryParam(req, 'pageSize') ?? '25')
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('donations')
        .select(
          'id, donation_id, member_id, donation_date, donation_month, donation_year, amount_inr, payment_method, transaction_reference, notes, recorded_by, is_deleted, created_at, member:members!inner(member_name, member_id, assigned_manager_id), recorder:profiles!donations_recorded_by_fkey(full_name)',
          { count: 'exact' },
        )
        .eq('is_deleted', false)
        .order('donation_date', { ascending: false })

      if (month) query = query.eq('donation_month', Number(month))
      if (year) query = query.eq('donation_year', Number(year))
      if (memberId) query = query.eq('member_id', memberId)
      if (paymentMethod) query = query.eq('payment_method', paymentMethod as PaymentMethod)
      if (dateFrom) query = query.gte('donation_date', dateFrom)
      if (dateTo) query = query.lte('donation_date', dateTo)

      const managerScope = resolveManagerScope(profile, readQueryParam(req, 'managerId'))
      if (managerScope) query = query.eq('member.assigned_manager_id', managerScope)

      const { data, error, count } = await query.range(from, to)
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [], count: count ?? 0 })
    }

    if (req.method === 'POST') {
      const values = await readJsonBody<Partial<DonationInsert> & { donation_date: string }>(req)
      if (!values.member_id) return sendError(res, 400, 'member_id is required.')

      if (profile.role !== 'ADMIN') {
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('assigned_manager_id')
          .eq('id', values.member_id)
          .maybeSingle()
        if (memberError) return sendSupabaseError(res, memberError)
        if (!member || member.assigned_manager_id !== profile.managerId) {
          return sendError(res, 403, 'You can only record donations for your own members.')
        }
      }

      const [year, month] = values.donation_date.split('-').map(Number)
      const { data, error } = await supabase
        .from('donations')
        .insert({
          member_id: values.member_id,
          donation_date: values.donation_date,
          donation_month: month,
          donation_year: year,
          amount_inr: values.amount_inr!,
          payment_method: values.payment_method!,
          transaction_reference: values.transaction_reference || null,
          notes: values.notes || null,
          // Always the caller's own profile id — never trust a client-supplied
          // recorded_by, matching the old RLS-forced check exactly.
          recorded_by: profile.id,
        })
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'donations', profile.id, data)
      return sendJson(res, 201, data)
    }

    if (req.method === 'PATCH' && id && action === 'softDelete') {
      if (!requireAdmin(res, profile)) return
      const { reason } = await readJsonBody<{ reason: string }>(req)
      const { data: oldRow, error: oldError } = await supabase.from('donations').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Donation not found.')

      const { data, error } = await supabase
        .from('donations')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          // Always the caller's own profile id — never trust a client-supplied
          // deleted_by.
          deleted_by: profile.id,
          deletion_reason: reason,
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'donations', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/donations]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
