import { authenticate, getServiceRoleClient, requireAdmin } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import { logInsert, logUpdate } from './_lib/auditLog.js'
import type { Database } from '../src/types/database'

type CategoryInsert = Database['public']['Tables']['expense_categories']['Insert']

// Same read-open / write-Admin-only shape as api/funds.ts — configurable
// lookups, not hard-coded, per §1 of the plan.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  const supabase = getServiceRoleClient()
  const id = readQueryParam(req, 'id')

  try {
    if (req.method === 'GET') {
      const includeInactive = readQueryParam(req, 'includeInactive') === 'true'
      let query = supabase.from('expense_categories').select('*').order('sort_order', { ascending: true })
      if (!includeInactive) query = query.eq('is_active', true)
      const { data, error } = await query
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'POST') {
      if (!requireAdmin(res, profile)) return
      const values = await readJsonBody<Partial<CategoryInsert>>(req)
      if (!values.name) return sendError(res, 400, 'name is required.')
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({ name: values.name.trim(), group_label: values.group_label || null, created_by: profile.id })
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'expense_categories', profile.id, data)
      return sendJson(res, 201, data)
    }

    if (req.method === 'PUT' && id) {
      if (!requireAdmin(res, profile)) return
      const values = await readJsonBody<Partial<CategoryInsert>>(req)
      const { data: oldRow, error: oldError } = await supabase.from('expense_categories').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Category not found.')

      const { data, error } = await supabase
        .from('expense_categories')
        .update({
          name: values.name?.trim(),
          group_label: values.group_label ?? undefined,
          is_active: values.is_active,
          sort_order: values.sort_order,
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'expense_categories', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/expense-categories]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
