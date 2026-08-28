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

    // Bundled as one action pair (not four, like the settings above) since
    // these 4 values are always read/edited together — one round trip for
    // every receipt render instead of four.
    if (req.method === 'GET' && action === 'receiptBranding') {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['RECEIPT_LOGO_URL', 'RECEIPT_BANNER_URL', 'RECEIPT_FOOTER_TEXT', 'RECEIPT_CONTACT_INFO'])
      if (error) return sendSupabaseError(res, error)
      const byKey = new Map((data ?? []).map((row) => [row.key, String(row.value ?? '')]))
      return sendJson(res, 200, {
        logoUrl: byKey.get('RECEIPT_LOGO_URL') ?? '',
        bannerUrl: byKey.get('RECEIPT_BANNER_URL') ?? '',
        footerText: byKey.get('RECEIPT_FOOTER_TEXT') ?? '',
        contactInfo: byKey.get('RECEIPT_CONTACT_INFO') ?? '',
      })
    }

    if (req.method === 'PUT' && action === 'receiptBranding') {
      if (!requireAdmin(res, profile)) return
      const { logoUrl, bannerUrl, footerText, contactInfo } = await readJsonBody<{
        logoUrl: string
        bannerUrl: string
        footerText: string
        contactInfo: string
      }>(req)
      const updatedAt = new Date().toISOString()
      const updates: [string, string][] = [
        ['RECEIPT_LOGO_URL', logoUrl ?? ''],
        ['RECEIPT_BANNER_URL', bannerUrl ?? ''],
        ['RECEIPT_FOOTER_TEXT', footerText ?? ''],
        ['RECEIPT_CONTACT_INFO', contactInfo ?? ''],
      ]
      for (const [key, value] of updates) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value, updated_by: profile.id, updated_at: updatedAt })
          .eq('key', key)
        if (error) return sendSupabaseError(res, error)
      }
      return sendJson(res, 200, { logoUrl, bannerUrl, footerText, contactInfo })
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/settings]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
