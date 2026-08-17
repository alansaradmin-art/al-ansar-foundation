import { authenticate, getServiceRoleClient, requireAdmin } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  const supabase = getServiceRoleClient()
  const action = readQueryParam(req, 'action')

  try {
    if (req.method === 'GET' && action === 'currentPeriod') {
      const { data, error } = await supabase.rpc('get_current_period').single()
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, data)
    }

    if (req.method === 'GET' && action === 'pendingDay') {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'FOLLOW_UP_PENDING_DAY')
        .single()
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { day: Number(data.value) })
    }

    if (req.method === 'PUT' && action === 'pendingDay') {
      if (!requireAdmin(res, profile)) return
      const { day } = await readJsonBody<{ day: number }>(req)
      const { error } = await supabase
        .from('app_settings')
        .update({ value: day, updated_by: profile.id, updated_at: new Date().toISOString() })
        .eq('key', 'FOLLOW_UP_PENDING_DAY')
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { day })
    }

    if (req.method === 'GET' && action === 'nonDonorThreshold') {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'NON_DONOR_ALERT_THRESHOLD')
        .single()
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { percent: Number(data.value) })
    }

    if (req.method === 'PUT' && action === 'nonDonorThreshold') {
      if (!requireAdmin(res, profile)) return
      const { percent } = await readJsonBody<{ percent: number }>(req)
      const { error } = await supabase
        .from('app_settings')
        .update({ value: percent, updated_by: profile.id, updated_at: new Date().toISOString() })
        .eq('key', 'NON_DONOR_ALERT_THRESHOLD')
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { percent })
    }

    if (req.method === 'GET' && action === 'pageSize') {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'DEFAULT_PAGE_SIZE')
        .single()
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { pageSize: Number(data.value) })
    }

    if (req.method === 'PUT' && action === 'pageSize') {
      if (!requireAdmin(res, profile)) return
      const { pageSize } = await readJsonBody<{ pageSize: number }>(req)
      const { error } = await supabase
        .from('app_settings')
        .update({ value: pageSize, updated_by: profile.id, updated_at: new Date().toISOString() })
        .eq('key', 'DEFAULT_PAGE_SIZE')
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { pageSize })
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/settings]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
