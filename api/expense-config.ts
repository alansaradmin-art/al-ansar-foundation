import { authenticate, getServiceRoleClient, requireAdmin } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import { logInsert, logUpdate } from './_lib/auditLog.js'
import type { CallerProfile } from './_lib/auth.js'
import type { Database } from '../src/types/database'

type FundInsert = Database['public']['Tables']['funds']['Insert']
type CategoryInsert = Database['public']['Tables']['expense_categories']['Insert']
type MethodInsert = Database['public']['Tables']['payment_methods']['Insert']
type GrantInsert = Database['public']['Tables']['profile_financial_roles']['Insert']

// The four small, near-identically-shaped configuration lookups behind the
// Expense module — funds, categories, payment methods, and committee
// financial-role grants — sharing one file (dispatched by ?resource=)
// rather than four separate ones, to stay under Vercel's Hobby-plan
// 12-serverless-function-per-deployment cap (main was already at exactly
// 12 before this module existed). See api/expenses.ts's matching comment.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  const supabase = getServiceRoleClient()
  const resource = readQueryParam(req, 'resource')

  if (resource === 'funds') return handleFunds(req, res, profile, supabase)
  if (resource === 'categories') return handleCategories(req, res, profile, supabase)
  if (resource === 'methods') return handleMethods(req, res, profile, supabase)
  if (resource === 'roles') return handleRoles(req, res, profile, supabase)
  sendError(res, 400, 'A resource query param (funds, categories, methods, or roles) is required.')
}

type Supabase = ReturnType<typeof getServiceRoleClient>

// ── ?resource=funds ──────────────────────────────────────────
// Read access is open to any authenticated role — every expense screen
// needs the fund list to populate a picker. Only Admin can create/edit
// one, same as every other configurable lookup in this module.
async function handleFunds(req: ApiRequest, res: ApiResponse, profile: CallerProfile, supabase: Supabase) {
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
    console.error('[api/expense-config?resource=funds]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}

// ── ?resource=categories ─────────────────────────────────────
// Same read-open / write-Admin-only shape as funds — configurable
// lookups, not hard-coded, per §1 of the plan.
async function handleCategories(req: ApiRequest, res: ApiResponse, profile: CallerProfile, supabase: Supabase) {
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
    console.error('[api/expense-config?resource=categories]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}

// ── ?resource=methods ────────────────────────────────────────
// Deliberately its own lookup, not shared with donations' hard-coded
// payment_method check constraint — see supabase/migrations/0040 for why.
async function handleMethods(req: ApiRequest, res: ApiResponse, profile: CallerProfile, supabase: Supabase) {
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
    console.error('[api/expense-config?resource=methods]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}

// ── ?resource=roles ───────────────────────────────────────────
// Admin-only: granting/revoking a financial role is how "committee
// membership" for expense-approval quorum is actually assembled (see
// supabase/migrations/0041). Reused by the Committee settings screen.
async function handleRoles(req: ApiRequest, res: ApiResponse, profile: CallerProfile, supabase: Supabase) {
  if (!requireAdmin(res, profile)) return
  const action = readQueryParam(req, 'action')
  const id = readQueryParam(req, 'id')

  try {
    // GET ?resource=roles — every currently active grant, across every
    // profile. The "who's on the committee right now" view.
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
    console.error('[api/expense-config?resource=roles]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
