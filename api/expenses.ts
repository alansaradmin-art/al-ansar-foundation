import { authenticate, getServiceRoleClient, hasActiveFinancialRole, requireAdmin } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import { logInsert, logUpdate } from './_lib/auditLog.js'
import type { CallerProfile } from './_lib/auth.js'
import type { Database } from '../src/types/database'

type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']
type ExpenseStatus = Database['public']['Tables']['expenses']['Row']['status']
type FinancialRoleCode = Database['public']['Tables']['profile_financial_roles']['Row']['role_code']
type Supabase = ReturnType<typeof getServiceRoleClient>

// Treasurer/Vice Treasurer are the only grants that can also disburse —
// matches the user's own framing ("payment is disbursed by treasure").
const DISBURSING_ROLES = ['TREASURER', 'VICE_TREASURER']

const EXPENSE_SELECT =
  'id, expense_number, expense_date, amount_inr, fund_id, category_id, beneficiary_id, paid_to, payment_method_id, ' +
  'transaction_reference, purpose, description, status, created_by, submitted_at, required_approval_roles, approved_at, ' +
  'rejected_at, rejected_by, rejected_reason, approval_cycle, paid_at, cancelled_at, cancelled_by, ' +
  'cancellation_reason, notes, created_at, updated_at, ' +
  'fund:funds(id, code, name), category:expense_categories(id, name), ' +
  'beneficiary:beneficiaries(id, display_name, is_confidential), payment_method:payment_methods(id, name), ' +
  'creator:profiles!expenses_created_by_fkey(full_name), rejecter:profiles!expenses_rejected_by_fkey(full_name), ' +
  'approvals:expense_approvals(id, approval_cycle, role_code, signer_id, action, is_override, comment, created_at, ' +
  'signer:profiles!expense_approvals_signer_id_fkey(full_name))'

// supabase-js can't statically type a hand-written embed string like
// EXPENSE_SELECT, so every mutation below writes/audits against a plain
// `select('*')` (typed, matches every other resource file's convention —
// see api/donations.ts) and re-fetches the joined shape only for the
// response the frontend actually renders.
function fetchExpenseWithRelations(supabase: Supabase, id: string) {
  return supabase.from('expenses').select(EXPENSE_SELECT).eq('id', id).single()
}

/** Caller may act as `roleCode` if they're Admin (Admin can fill any open
 * committee slot) or hold that exact grant themselves. Used for both
 * signing and, narrower, for who may mark an Approved expense Paid. */
async function canActAsRole(supabase: Supabase, profile: CallerProfile, roleCode: string): Promise<boolean> {
  if (profile.role === 'ADMIN') return true
  return hasActiveFinancialRole(supabase, profile.id, roleCode)
}

async function canDisburse(supabase: Supabase, profile: CallerProfile): Promise<boolean> {
  if (profile.role === 'ADMIN') return true
  for (const role of DISBURSING_ROLES) {
    if (await hasActiveFinancialRole(supabase, profile.id, role)) return true
  }
  return false
}

// Creation, editing, submission, and cancellation stay Admin-only in Phase
// 2, same as Phase 1 — only *signing* (and, narrower, disbursing) opens up
// to a non-Admin profile_financial_roles grant holder, since that's the
// entire point of the committee-quorum model. See the Expense Management
// Plan artifact §E/§L.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  const supabase = getServiceRoleClient()
  const action = readQueryParam(req, 'action')
  const id = readQueryParam(req, 'id')

  try {
    if (req.method === 'GET' && id) {
      if (!requireAdmin(res, profile)) return
      const { data, error } = await supabase.from('expenses').select(EXPENSE_SELECT).eq('id', id).maybeSingle()
      if (error) return sendSupabaseError(res, error)
      if (!data) return sendError(res, 404, 'Expense not found.')
      return sendJson(res, 200, data)
    }

    if (req.method === 'GET') {
      if (!requireAdmin(res, profile)) return
      const search = readQueryParam(req, 'search')?.trim()
      const fundId = readQueryParam(req, 'fundId')
      const categoryId = readQueryParam(req, 'categoryId')
      const status = readQueryParam(req, 'status')
      const dateFrom = readQueryParam(req, 'dateFrom')
      const dateTo = readQueryParam(req, 'dateTo')
      const page = Number(readQueryParam(req, 'page') ?? '1')
      const pageSize = Number(readQueryParam(req, 'pageSize') ?? '20')
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('expenses')
        .select(EXPENSE_SELECT, { count: 'exact' })
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (fundId) query = query.eq('fund_id', fundId)
      if (categoryId) query = query.eq('category_id', categoryId)
      if (status) query = query.eq('status', status as ExpenseStatus)
      if (dateFrom) query = query.gte('expense_date', dateFrom)
      if (dateTo) query = query.lte('expense_date', dateTo)
      if (search) query = query.or(`purpose.ilike.%${search}%,expense_number.ilike.%${search}%,paid_to.ilike.%${search}%`)

      const { data, error, count } = await query.range(from, to)
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [], count: count ?? 0 })
    }

    if (req.method === 'POST' && action === 'submit' && id) {
      if (!requireAdmin(res, profile)) return
      const { data: oldRow, error: oldError } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Expense not found.')
      if (oldRow.status !== 'DRAFT') {
        return sendError(res, 409, `This expense is ${oldRow.status.toLowerCase()} and cannot be submitted.`, 'INVALID_STATUS')
      }

      const { data: setting, error: settingError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'EXPENSE_APPROVAL_QUORUM_ROLES')
        .single()
      if (settingError) return sendSupabaseError(res, settingError)
      const requiredRoles = (setting.value as FinancialRoleCode[]) ?? []
      if (requiredRoles.length === 0) {
        return sendError(res, 500, 'No committee roles are configured for approval. Set them up in Settings first.', 'NO_QUORUM_ROLES')
      }

      // A resubmission (this expense has been through Submitted before, via
      // a prior reject-then-reopen cycle) bumps approval_cycle so its fresh
      // signatures never collide with the previous cycle's rows in
      // expense_approvals — see idx_expense_approvals_active.
      const nextCycle = oldRow.submitted_at ? oldRow.approval_cycle + 1 : oldRow.approval_cycle

      const { data: updated, error } = await supabase
        .from('expenses')
        .update({
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString(),
          required_approval_roles: requiredRoles,
          approval_cycle: nextCycle,
        })
        .eq('id', id)
        .eq('status', 'DRAFT')
        .select('*')
        .maybeSingle()
      if (error) return sendSupabaseError(res, error)
      if (!updated) return sendError(res, 409, 'This expense is no longer in Draft.', 'INVALID_STATUS')
      await logUpdate(supabase, 'expenses', profile.id, oldRow, updated)
      const { data, error: fetchError } = await fetchExpenseWithRelations(supabase, id)
      if (fetchError) return sendSupabaseError(res, fetchError)
      return sendJson(res, 200, data)
    }

    if (req.method === 'POST' && action === 'sign' && id) {
      const { role_code, decision, comment } = await readJsonBody<{
        role_code?: string
        decision?: 'APPROVE' | 'REJECT'
        comment?: string
      }>(req)
      if (!role_code || !decision) return sendError(res, 400, 'role_code and decision are required.')
      if (decision === 'REJECT' && !comment?.trim()) return sendError(res, 400, 'A comment is required when rejecting.')
      const roleCode = role_code as FinancialRoleCode

      const { data: expense, error: expenseError } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle()
      if (expenseError) return sendSupabaseError(res, expenseError)
      if (!expense) return sendError(res, 404, 'Expense not found.')
      if (expense.status !== 'SUBMITTED') {
        return sendError(res, 409, 'This expense is not currently awaiting approval.', 'INVALID_STATUS')
      }
      const requiredRoles: FinancialRoleCode[] = expense.required_approval_roles ?? []
      if (!requiredRoles.includes(roleCode)) {
        return sendError(res, 400, `${roleCode} is not a required approver for this expense.`)
      }
      if (expense.created_by === profile.id) {
        return sendError(res, 403, 'You cannot sign off on an expense you created yourself.', 'SELF_APPROVAL')
      }
      if (!(await canActAsRole(supabase, profile, roleCode))) {
        return sendError(res, 403, `You don't hold an active ${roleCode} grant.`)
      }

      const { data: existingSignature, error: existingError } = await supabase
        .from('expense_approvals')
        .select('id')
        .eq('expense_id', id)
        .eq('approval_cycle', expense.approval_cycle)
        .eq('role_code', roleCode)
        .maybeSingle()
      if (existingError) return sendSupabaseError(res, existingError)
      if (existingSignature) return sendError(res, 409, `${roleCode} has already signed this expense.`, 'ALREADY_SIGNED')

      // The database trigger (prevent_expense_self_approval) is the real,
      // unconditional backstop for the self-approval rule above — this
      // insert would fail even if the check a few lines up were somehow
      // bypassed.
      const { data: signature, error: signError } = await supabase
        .from('expense_approvals')
        .insert({
          expense_id: id,
          approval_cycle: expense.approval_cycle,
          role_code: roleCode,
          signer_id: profile.id,
          action: decision,
          comment: comment?.trim() || null,
        })
        .select('*')
        .single()
      if (signError) return sendSupabaseError(res, signError)
      await logInsert(supabase, 'expense_approvals', profile.id, signature)

      if (decision === 'REJECT') {
        const { error: rejectError } = await supabase
          .from('expenses')
          .update({
            status: 'REJECTED',
            rejected_at: new Date().toISOString(),
            rejected_by: profile.id,
            rejected_reason: comment!.trim(),
          })
          .eq('id', id)
          .eq('status', 'SUBMITTED')
        if (rejectError) return sendSupabaseError(res, rejectError)
      } else {
        const { data: signaturesThisCycle, error: signaturesError } = await supabase
          .from('expense_approvals')
          .select('role_code, action')
          .eq('expense_id', id)
          .eq('approval_cycle', expense.approval_cycle)
          .eq('action', 'APPROVE')
        if (signaturesError) return sendSupabaseError(res, signaturesError)
        const signedRoles = new Set((signaturesThisCycle ?? []).map((s) => s.role_code))
        const quorumMet = requiredRoles.every((role) => signedRoles.has(role))
        if (quorumMet) {
          const { error: approveError } = await supabase
            .from('expenses')
            .update({ status: 'APPROVED', approved_at: new Date().toISOString() })
            .eq('id', id)
            .eq('status', 'SUBMITTED')
          if (approveError) return sendSupabaseError(res, approveError)
        }
      }

      const { data, error: fetchError } = await fetchExpenseWithRelations(supabase, id)
      if (fetchError) return sendSupabaseError(res, fetchError)
      return sendJson(res, 200, data)
    }

    // Admin-only emergency path: force-approves regardless of how many
    // required signatures are still outstanding. Exists specifically for
    // the "not enough officers yet" gap the plan flags as a real risk for
    // a small Foundation — deliberately never silent: mandatory reason,
    // recorded as its own is_override=true row (never mistaken for a real
    // quorum signature), and still blocked from being used on the Admin's
    // own expense by the same self-approval trigger everything else uses.
    if (req.method === 'POST' && action === 'overrideApprove' && id) {
      if (!requireAdmin(res, profile)) return
      const { reason } = await readJsonBody<{ reason?: string }>(req)
      if (!reason?.trim()) return sendError(res, 400, 'A reason is required to override committee approval.')

      const { data: expense, error: expenseError } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle()
      if (expenseError) return sendSupabaseError(res, expenseError)
      if (!expense) return sendError(res, 404, 'Expense not found.')
      if (expense.status !== 'SUBMITTED') {
        return sendError(res, 409, 'This expense is not currently awaiting approval.', 'INVALID_STATUS')
      }
      if (expense.created_by === profile.id) {
        return sendError(res, 403, 'You cannot override approval on an expense you created yourself.', 'SELF_APPROVAL')
      }

      const { data: overrideRow, error: overrideError } = await supabase
        .from('expense_approvals')
        .insert({
          expense_id: id,
          approval_cycle: expense.approval_cycle,
          role_code: null,
          signer_id: profile.id,
          action: 'APPROVE',
          is_override: true,
          comment: reason.trim(),
        })
        .select('*')
        .single()
      if (overrideError) return sendSupabaseError(res, overrideError)
      await logInsert(supabase, 'expense_approvals', profile.id, overrideRow)

      const { error } = await supabase
        .from('expenses')
        .update({ status: 'APPROVED', approved_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'SUBMITTED')
      if (error) return sendSupabaseError(res, error)
      const { data, error: fetchError } = await fetchExpenseWithRelations(supabase, id)
      if (fetchError) return sendSupabaseError(res, fetchError)
      return sendJson(res, 200, data)
    }

    // Creator reopens a Rejected expense back to Draft to correct and
    // resubmit — a genuine new approval cycle (§F), never a reinstatement
    // of the old one. rejected_* is cleared; submitted_at deliberately
    // isn't, so the next ?action=submit can tell this is a resubmission
    // and bump approval_cycle.
    if (req.method === 'POST' && action === 'reopen' && id) {
      const { data: oldRow, error: oldError } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Expense not found.')
      if (oldRow.status !== 'REJECTED') return sendError(res, 409, 'Only a rejected expense can be reopened.', 'INVALID_STATUS')
      if (oldRow.created_by !== profile.id && profile.role !== 'ADMIN') {
        return sendError(res, 403, 'Only the expense’s creator can reopen it.')
      }

      const { data: updated, error } = await supabase
        .from('expenses')
        .update({ status: 'DRAFT', rejected_at: null, rejected_by: null, rejected_reason: null })
        .eq('id', id)
        .eq('status', 'REJECTED')
        .select('*')
        .maybeSingle()
      if (error) return sendSupabaseError(res, error)
      if (!updated) return sendError(res, 409, 'This expense is no longer rejected.', 'INVALID_STATUS')
      await logUpdate(supabase, 'expenses', profile.id, oldRow, updated)
      const { data, error: fetchError } = await fetchExpenseWithRelations(supabase, id)
      if (fetchError) return sendSupabaseError(res, fetchError)
      return sendJson(res, 200, data)
    }

    if (req.method === 'POST' && action === 'markPaid' && id) {
      if (!(await canDisburse(supabase, profile))) {
        return sendError(res, 403, 'Only Admin or a Treasurer/Vice Treasurer grant holder can disburse an expense.')
      }
      const { payment_method_id, transaction_reference } = await readJsonBody<{
        payment_method_id?: string
        transaction_reference?: string
      }>(req)
      if (!payment_method_id) return sendError(res, 400, 'payment_method_id is required.')

      const { data: method, error: methodError } = await supabase
        .from('payment_methods')
        .select('requires_reference')
        .eq('id', payment_method_id)
        .maybeSingle()
      if (methodError) return sendSupabaseError(res, methodError)
      if (!method) return sendError(res, 400, 'Selected payment method was not found.')
      if (method.requires_reference && !transaction_reference?.trim()) {
        return sendError(res, 400, 'A transaction reference is required for this payment method.')
      }

      const { data: oldRow, error: oldError } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Expense not found.')

      // The where-status guard makes this concurrency-safe: two simultaneous
      // "mark paid" clicks can't both succeed — the loser gets a clean 409
      // instead of silently re-running the payment.
      const { data: updated, error } = await supabase
        .from('expenses')
        .update({
          status: 'PAID',
          payment_method_id,
          transaction_reference: transaction_reference?.trim() || null,
          paid_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'APPROVED')
        .select('*')
        .maybeSingle()
      if (error) return sendSupabaseError(res, error)
      if (!updated) return sendError(res, 409, 'This expense is not currently Approved — it may already be paid, or not yet fully signed off.', 'INVALID_STATUS')
      await logUpdate(supabase, 'expenses', profile.id, oldRow, updated)
      const { data, error: fetchError } = await fetchExpenseWithRelations(supabase, id)
      if (fetchError) return sendSupabaseError(res, fetchError)
      return sendJson(res, 200, data)
    }

    if (req.method === 'POST' && action === 'cancel' && id) {
      if (!requireAdmin(res, profile)) return
      const { reason } = await readJsonBody<{ reason?: string }>(req)
      if (!reason?.trim()) return sendError(res, 400, 'A cancellation reason is required.')

      const { data: oldRow, error: oldError } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Expense not found.')
      if (oldRow.status === 'CANCELLED') return sendError(res, 409, 'This expense is already cancelled.', 'INVALID_STATUS')

      const { data: updated, error } = await supabase
        .from('expenses')
        .update({
          status: 'CANCELLED',
          cancelled_at: new Date().toISOString(),
          cancelled_by: profile.id,
          cancellation_reason: reason.trim(),
        })
        .eq('id', id)
        .neq('status', 'CANCELLED')
        .select('*')
        .maybeSingle()
      if (error) return sendSupabaseError(res, error)
      if (!updated) return sendError(res, 409, 'This expense is already cancelled.', 'INVALID_STATUS')
      await logUpdate(supabase, 'expenses', profile.id, oldRow, updated)
      const { data, error: fetchError } = await fetchExpenseWithRelations(supabase, id)
      if (fetchError) return sendSupabaseError(res, fetchError)
      return sendJson(res, 200, data)
    }

    if (req.method === 'POST') {
      if (!requireAdmin(res, profile)) return
      const values = await readJsonBody<Partial<ExpenseInsert>>(req)
      if (!values.expense_date || !values.amount_inr || !values.fund_id || !values.category_id || !values.purpose?.trim()) {
        return sendError(res, 400, 'expense_date, amount_inr, fund_id, category_id, and purpose are required.')
      }

      const { data: inserted, error } = await supabase
        .from('expenses')
        .insert({
          expense_date: values.expense_date,
          amount_inr: values.amount_inr,
          fund_id: values.fund_id,
          category_id: values.category_id,
          beneficiary_id: values.beneficiary_id || null,
          paid_to: values.paid_to?.trim() || null,
          purpose: values.purpose.trim(),
          description: values.description?.trim() || null,
          notes: values.notes?.trim() || null,
          status: 'DRAFT',
          // Always the caller's own profile id — never trust a
          // client-supplied created_by.
          created_by: profile.id,
        })
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'expenses', profile.id, inserted)
      const { data, error: fetchError } = await fetchExpenseWithRelations(supabase, inserted.id)
      if (fetchError) return sendSupabaseError(res, fetchError)
      return sendJson(res, 201, data)
    }

    if (req.method === 'PUT' && id) {
      if (!requireAdmin(res, profile)) return
      const values = await readJsonBody<Partial<ExpenseUpdate>>(req)
      const { data: oldRow, error: oldError } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Expense not found.')
      if (oldRow.status !== 'DRAFT') {
        return sendError(res, 409, `This expense is ${oldRow.status.toLowerCase()} and can no longer be edited.`, 'INVALID_STATUS')
      }

      const { data: updated, error } = await supabase
        .from('expenses')
        .update({
          expense_date: values.expense_date,
          amount_inr: values.amount_inr,
          fund_id: values.fund_id,
          category_id: values.category_id,
          beneficiary_id: values.beneficiary_id ?? null,
          paid_to: values.paid_to?.trim() || null,
          purpose: values.purpose?.trim(),
          description: values.description?.trim() || null,
          notes: values.notes?.trim() || null,
        })
        .eq('id', id)
        .eq('status', 'DRAFT')
        .select('*')
        .maybeSingle()
      if (error) return sendSupabaseError(res, error)
      if (!updated) return sendError(res, 409, 'This expense was changed by someone else — please refresh and try again.', 'INVALID_STATUS')
      await logUpdate(supabase, 'expenses', profile.id, oldRow, updated)
      const { data, error: fetchError } = await fetchExpenseWithRelations(supabase, id)
      if (fetchError) return sendSupabaseError(res, fetchError)
      return sendJson(res, 200, data)
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/expenses]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
