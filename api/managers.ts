import { authenticate, getServiceRoleClient, requireAdmin } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import { logInsert, logUpdate } from './_lib/auditLog.js'
import { isValidCountryIso2 } from './_lib/countries.js'
import type { Database, ManagerStatus } from '../src/types/database'

type ManagerRow = Database['public']['Tables']['managers']['Row']
type ManagerInsert = Database['public']['Tables']['managers']['Insert']

/** Sanitizes phone to digits-only whenever a recognized country came with
 * it (ManagerForm's CountryPhoneField always sends both together); leaves
 * phone untouched otherwise, since — unlike members.mobile_number —
 * manager phone numbers never went through any normalization historically,
 * so there's no established "guess" fallback to apply here. */
function toManagerRow(values: Partial<ManagerInsert>): Partial<ManagerInsert> {
  if (values.phone === undefined && values.phone_country === undefined) return values
  const country = isValidCountryIso2(values.phone_country) ? values.phone_country.toUpperCase() : null
  return {
    ...values,
    phone: values.phone !== undefined && country ? values.phone.replace(/\D/g, '') : values.phone,
    phone_country: country,
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  const supabase = getServiceRoleClient()
  const id = readQueryParam(req, 'id')
  const action = readQueryParam(req, 'action')

  try {
    if (req.method === 'GET' && id) {
      // Mirrors managers_select RLS exactly: Admin reads any row, a
      // Manager only their own (used by AssignedManagerCard on both roles'
      // Member Detail pages).
      if (profile.role !== 'ADMIN' && profile.managerId !== id) {
        return sendError(res, 404, 'Manager not found.')
      }
      const { data, error } = await supabase.from('managers').select('*').eq('id', id).maybeSingle()
      if (error) return sendSupabaseError(res, error)
      if (!data) return sendError(res, 404, 'Manager not found.')
      return sendJson(res, 200, data)
    }

    if (req.method === 'GET') {
      if (!requireAdmin(res, profile)) return
      const status = readQueryParam(req, 'status')
      const search = readQueryParam(req, 'search')?.trim()
      const pageParam = readQueryParam(req, 'page')
      const pageSizeParam = readQueryParam(req, 'pageSize')

      let query = supabase.from('managers').select('*', { count: 'exact' }).order('full_name')
      if (status) query = query.eq('status', status as ManagerStatus)
      if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
      // Pagination is opt-in: every existing dropdown/picker caller never
      // sends page/pageSize and keeps getting the full flat list exactly
      // as before — only the Admin Managers list page passes these.
      if (pageParam && pageSizeParam) {
        const page = Number(pageParam)
        const pageSize = Number(pageSizeParam)
        const from = (page - 1) * pageSize
        query = query.range(from, from + pageSize - 1)
      }

      const { data, error, count } = await query
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [], count: count ?? data?.length ?? 0 })
    }

    if (req.method === 'POST') {
      if (!requireAdmin(res, profile)) return
      const values = await readJsonBody<Partial<ManagerInsert>>(req)
      const { data, error } = await supabase.from('managers').insert(toManagerRow(values) as ManagerInsert).select('*').single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'managers', profile.id, data)
      return sendJson(res, 201, data)
    }

    if (req.method === 'PUT' && id) {
      if (!requireAdmin(res, profile)) return
      const values = await readJsonBody<Partial<ManagerInsert>>(req)
      const { data: oldRow, error: oldError } = await supabase.from('managers').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Manager not found.')

      const { data, error } = await supabase.from('managers').update(toManagerRow(values)).eq('id', id).select('*').single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'managers', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    if (req.method === 'PATCH' && id && action === 'status') {
      if (!requireAdmin(res, profile)) return
      const { status } = await readJsonBody<{ status: ManagerRow['status'] }>(req)
      const { data: oldRow, error: oldError } = await supabase.from('managers').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Manager not found.')

      const { data, error } = await supabase.from('managers').update({ status }).eq('id', id).select('*').single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'managers', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/managers]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
