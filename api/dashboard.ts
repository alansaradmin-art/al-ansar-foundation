import { authenticate, getServiceRoleClient, requireAdmin, resolveManagerScope } from './_lib/auth'
import { type ApiRequest, type ApiResponse, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed.')

  const profile = await authenticate(req, res)
  if (!profile) return
  const supabase = getServiceRoleClient()
  const type = readQueryParam(req, 'type')

  try {
    if (type === 'manager') {
      const managerScope = resolveManagerScope(profile, readQueryParam(req, 'managerId'))
      if (!managerScope) return sendError(res, 400, 'managerId is required.')
      const month = Number(readQueryParam(req, 'month'))
      const year = Number(readQueryParam(req, 'year'))
      const { data, error } = await supabase
        .rpc('manager_dashboard_stats', { p_manager_id: managerScope, p_month: month, p_year: year })
        .single()
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, data)
    }

    if (type === 'admin') {
      if (!requireAdmin(res, profile)) return
      const month = Number(readQueryParam(req, 'month'))
      const year = Number(readQueryParam(req, 'year'))
      const { data, error } = await supabase.rpc('admin_dashboard_stats', { p_month: month, p_year: year }).single()
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, data)
    }

    if (type === 'managerWiseReport') {
      if (!requireAdmin(res, profile)) return
      const month = Number(readQueryParam(req, 'month'))
      const year = Number(readQueryParam(req, 'year'))
      const { data, error } = await supabase.rpc('manager_wise_report', { p_month: month, p_year: year })
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (type === 'monthWiseReport') {
      if (!requireAdmin(res, profile)) return
      const year = Number(readQueryParam(req, 'year'))
      const { data, error } = await supabase.rpc('month_wise_report', { p_year: year })
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    sendError(res, 400, 'Unknown dashboard type.')
  } catch (error) {
    console.error('[api/dashboard]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
