import { authenticate, getServiceRoleClient, requireAdmin } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import { logInsert } from './_lib/auditLog.js'
import type { Database } from '../src/types/database'

type BeneficiaryInsert = Database['public']['Tables']['beneficiaries']['Insert']

// Admin-only end to end in Phase 1 — matches every other expense endpoint
// until Phase 2's Treasurer grant exists. A confidential beneficiary's
// identity fields are never populated in the first place (enforced by the
// DB check in 0040), so there's no separate redaction step needed here.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  if (!requireAdmin(res, profile)) return
  const supabase = getServiceRoleClient()
  const action = readQueryParam(req, 'action')
  const id = readQueryParam(req, 'id')

  try {
    if (req.method === 'GET' && action === 'picker') {
      const search = readQueryParam(req, 'search')?.trim()
      let query = supabase
        .from('beneficiaries')
        .select('id, display_name, phone, is_confidential')
        .order('display_name', { ascending: true })
        .limit(20)
      if (search) query = query.ilike('display_name', `%${search}%`)
      const { data, error } = await query
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'GET' && id) {
      const { data, error } = await supabase.from('beneficiaries').select('*').eq('id', id).maybeSingle()
      if (error) return sendSupabaseError(res, error)
      if (!data) return sendError(res, 404, 'Beneficiary not found.')
      return sendJson(res, 200, data)
    }

    if (req.method === 'GET') {
      const search = readQueryParam(req, 'search')?.trim()
      let query = supabase.from('beneficiaries').select('*', { count: 'exact' }).order('created_at', { ascending: false })
      if (search) query = query.or(`display_name.ilike.%${search}%,phone.ilike.%${search}%`)
      const { data, error, count } = await query
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [], count: count ?? 0 })
    }

    if (req.method === 'POST') {
      const values = await readJsonBody<Partial<BeneficiaryInsert>>(req)
      if (!values.is_confidential && !values.display_name?.trim()) {
        return sendError(res, 400, 'display_name is required unless the beneficiary is confidential.')
      }
      const isConfidential = values.is_confidential === true
      const { data, error } = await supabase
        .from('beneficiaries')
        .insert({
          member_id: isConfidential ? null : values.member_id || null,
          display_name: isConfidential ? null : values.display_name!.trim(),
          phone: isConfidential ? null : values.phone || null,
          address: values.address || null,
          is_confidential: isConfidential,
          notes: values.notes || null,
          created_by: profile.id,
        })
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'beneficiaries', profile.id, data)
      return sendJson(res, 201, data)
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/beneficiaries]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
