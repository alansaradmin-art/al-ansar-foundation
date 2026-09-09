import { authenticate, getServiceRoleClient, requireAdmin } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import { logInsert, logUpdate } from './_lib/auditLog.js'
import type { Database } from '../src/types/database'

type GrantInsert = Database['public']['Tables']['profile_financial_roles']['Insert']

// Admin-only: granting/revoking a financial role is how "committee
// membership" for expense-approval quorum is actually assembled (see
// supabase/migrations/0041). Reused by the Committee settings screen.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  if (!requireAdmin(res, profile)) return
  const supabase = getServiceRoleClient()
  const action = readQueryParam(req, 'action')
  const id = readQueryParam(req, 'id')

  try {
    // GET /api/profile-financial-roles — every currently active grant,
    // across every profile. The "who's on the committee right now" view.
    if (req.method === 'GET' && !action) {
      const { data, error } = await supabase
        .from('profile_financial_roles')
        .select('*, profile:profiles!profile_financial_roles_profile_id_fkey(full_name, role, is_active)')
        .is('revoked_at', null)
        .order('role_code')
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'GET' && action === 'forProfile') {
      const profileId = readQueryParam(req, 'profileId')
      if (!profileId) return sendError(res, 400, 'profileId is required.')
      const { data, error } = await supabase
        .from('profile_financial_roles')
        .select('*')
        .eq('profile_id', profileId)
        .order('granted_at', { ascending: false })
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'POST' && action === 'grant') {
      const values = await readJsonBody<Partial<GrantInsert>>(req)
      if (!values.profile_id || !values.role_code) return sendError(res, 400, 'profile_id and role_code are required.')

      const { data, error } = await supabase
        .from('profile_financial_roles')
        .insert({ profile_id: values.profile_id, role_code: values.role_code, granted_by: profile.id })
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'profile_financial_roles', profile.id, data)
      return sendJson(res, 201, data)
    }

    if (req.method === 'POST' && action === 'revoke' && id) {
      const { data: oldRow, error: oldError } = await supabase.from('profile_financial_roles').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Grant not found.')
      if (oldRow.revoked_at) return sendError(res, 409, 'This grant is already revoked.', 'INVALID_STATUS')

      const { data, error } = await supabase
        .from('profile_financial_roles')
        .update({ revoked_at: new Date().toISOString(), revoked_by: profile.id })
        .eq('id', id)
        .is('revoked_at', null)
        .select('*')
        .maybeSingle()
      if (error) return sendSupabaseError(res, error)
      if (!data) return sendError(res, 409, 'This grant is already revoked.', 'INVALID_STATUS')
      await logUpdate(supabase, 'profile_financial_roles', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/profile-financial-roles]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
