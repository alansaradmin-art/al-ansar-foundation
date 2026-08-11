import { authenticate, getServiceRoleClient, requireAdmin } from './_lib/auth'
import { type ApiRequest, type ApiResponse, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed.')

  const profile = await authenticate(req, res)
  if (!profile) return
  if (!requireAdmin(res, profile)) return
  const supabase = getServiceRoleClient()

  try {
    const entityType = readQueryParam(req, 'entityType')
    const action = readQueryParam(req, 'action')
    const page = Number(readQueryParam(req, 'page') ?? '1')
    const pageSize = Number(readQueryParam(req, 'pageSize') ?? '25')
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('audit_logs')
      .select('*, actor:profiles(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (entityType) query = query.eq('entity_type', entityType)
    if (action) query = query.eq('action', action)

    const { data, error, count } = await query.range(from, to)
    if (error) return sendSupabaseError(res, error)
    return sendJson(res, 200, { rows: data ?? [], count: count ?? 0 })
  } catch (error) {
    console.error('[api/audit-logs]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
