import { authenticate, getServiceRoleClient, requireAdmin } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import { logInsert, logUpdate } from './_lib/auditLog.js'
import type { Database } from '../src/types/database'

type MethodInsert = Database['public']['Tables']['payment_methods']['Insert']

// Deliberately its own lookup table, not shared with donations' hard-coded
// payment_method check constraint — see supabase/migrations/0040 for why.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  const supabase = getServiceRoleClient()
  const id = readQueryParam(req, 'id')

  try {
    if (req.method === 'GET') {
      const includeInactive = readQueryParam(req, 'includeInactive') === 'true'
      let query = supabase.from('payment_methods').select('*').order('sort_order', { ascending: true })
      if (!includeInactive) query = query.eq('is_active', true)
      const { data, error } = await query
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'POST') {
      if (!requireAdmin(res, profile)) return
      const values = await readJsonBody<Partial<MethodInsert>>(req)
      if (!values.name) return sendError(res, 400, 'name is required.')
      const { data, error } = await supabase
        .from('payment_methods')
        .insert({ name: values.name.trim(), requires_reference: values.requires_reference ?? false })
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'payment_methods', profile.id, data)
      return sendJson(res, 201, data)
    }

    if (req.method === 'PUT' && id) {
      if (!requireAdmin(res, profile)) return
      const values = await readJsonBody<Partial<MethodInsert>>(req)
      const { data: oldRow, error: oldError } = await supabase.from('payment_methods').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Payment method not found.')

      const { data, error } = await supabase
        .from('payment_methods')
        .update({
          name: values.name?.trim(),
          requires_reference: values.requires_reference,
          is_active: values.is_active,
          sort_order: values.sort_order,
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'payment_methods', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/payment-methods]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
