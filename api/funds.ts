import { authenticate, getServiceRoleClient, requireAdmin } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import { logInsert, logUpdate } from './_lib/auditLog.js'
import type { Database } from '../src/types/database'

type FundInsert = Database['public']['Tables']['funds']['Insert']

// Read access is open to any authenticated role — every expense screen
// needs the fund list to populate a picker. Only Admin can create/edit one,
// same as every other configurable lookup in this module (§E of the plan:
// Phase 1 is Admin-only throughout).
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  const supabase = getServiceRoleClient()
  const id = readQueryParam(req, 'id')

  try {
    // Live balance per active fund — Donations − Paid Expenses, computed
    // fresh on every call (fund_balances_summary(), see
    // supabase/migrations/0042). Financial figures, so Admin-only, unlike
    // the plain fund list below which every picker needs read access to.
    if (req.method === 'GET' && readQueryParam(req, 'action') === 'balances') {
      if (!requireAdmin(res, profile)) return
      const { data, error } = await supabase.rpc('fund_balances_summary')
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'GET') {
      const includeInactive = readQueryParam(req, 'includeInactive') === 'true'
      let query = supabase.from('funds').select('*').order('sort_order', { ascending: true })
      if (!includeInactive) query = query.eq('is_active', true)
      const { data, error } = await query
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'POST') {
      if (!requireAdmin(res, profile)) return
      const values = await readJsonBody<Partial<FundInsert>>(req)
      if (!values.code || !values.name) return sendError(res, 400, 'code and name are required.')
      const { data, error } = await supabase
        .from('funds')
        .insert({ code: values.code.trim().toUpperCase(), name: values.name.trim(), description: values.description || null })
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'funds', profile.id, data)
      return sendJson(res, 201, data)
    }

    if (req.method === 'PUT' && id) {
      if (!requireAdmin(res, profile)) return
      const values = await readJsonBody<Partial<FundInsert>>(req)
      const { data: oldRow, error: oldError } = await supabase.from('funds').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Fund not found.')

      const { data, error } = await supabase
        .from('funds')
        .update({
          name: values.name?.trim(),
          description: values.description ?? undefined,
          is_active: values.is_active,
          sort_order: values.sort_order,
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'funds', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/funds]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
