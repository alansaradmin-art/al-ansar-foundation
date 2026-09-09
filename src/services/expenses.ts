import { apiClient, type GetToken } from '@/lib/apiClient'
import type { ApprovalAction, Expense, ExpenseStatus, FinancialRoleCode, PaginatedResult } from '@/types'
import type { ExpenseFormValues } from '@/schemas/expense.schema'

export type ExpenseApprovalWithSigner = {
  id: string
  approval_cycle: number
  role_code: FinancialRoleCode | null
  signer_id: string
  action: ApprovalAction
  is_override: boolean
  comment: string | null
  created_at: string
  signer: { full_name: string } | null
}

export type ExpenseWithRelations = Expense & {
  fund: { id: string; code: string; name: string } | null
  category: { id: string; name: string } | null
  beneficiary: { id: string; display_name: string | null; is_confidential: boolean } | null
  payment_method: { id: string; name: string } | null
  creator: { full_name: string } | null
  rejecter: { full_name: string } | null
  approvals: ExpenseApprovalWithSigner[]
}

export interface ExpenseFilters {
  search?: string
  fundId?: string
  categoryId?: string
  status?: ExpenseStatus | 'ALL'
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export async function listExpenses(getToken: GetToken, filters: ExpenseFilters = {}): Promise<PaginatedResult<ExpenseWithRelations>> {
  const { status, ...rest } = filters
  return apiClient.get('/api/expenses', getToken, { ...rest, status: status === 'ALL' ? undefined : status })
}

export async function getExpense(getToken: GetToken, id: string): Promise<ExpenseWithRelations> {
  return apiClient.get('/api/expenses', getToken, { id })
}

export async function createExpense(getToken: GetToken, values: ExpenseFormValues): Promise<ExpenseWithRelations> {
  return apiClient.post('/api/expenses', getToken, values)
}

export async function updateExpense(getToken: GetToken, id: string, values: ExpenseFormValues): Promise<ExpenseWithRelations> {
  return apiClient.put('/api/expenses', getToken, values, { id })
}

export async function submitExpense(getToken: GetToken, id: string): Promise<ExpenseWithRelations> {
  return apiClient.post('/api/expenses', getToken, undefined, { id, action: 'submit' })
}

export async function signExpense(
  getToken: GetToken,
  id: string,
  roleCode: FinancialRoleCode,
  decision: ApprovalAction,
  comment: string | undefined,
): Promise<ExpenseWithRelations> {
  return apiClient.post('/api/expenses', getToken, { role_code: roleCode, decision, comment }, { id, action: 'sign' })
}

export async function overrideApproveExpense(getToken: GetToken, id: string, reason: string): Promise<ExpenseWithRelations> {
  return apiClient.post('/api/expenses', getToken, { reason }, { id, action: 'overrideApprove' })
}

export async function reopenExpense(getToken: GetToken, id: string): Promise<ExpenseWithRelations> {
  return apiClient.post('/api/expenses', getToken, undefined, { id, action: 'reopen' })
}

export async function markExpensePaid(
  getToken: GetToken,
  id: string,
  paymentMethodId: string,
  transactionReference: string | undefined,
): Promise<ExpenseWithRelations> {
  return apiClient.post(
    '/api/expenses',
    getToken,
    { payment_method_id: paymentMethodId, transaction_reference: transactionReference },
    { id, action: 'markPaid' },
  )
}

export async function cancelExpense(getToken: GetToken, id: string, reason: string): Promise<ExpenseWithRelations> {
  return apiClient.post('/api/expenses', getToken, { reason }, { id, action: 'cancel' })
}
