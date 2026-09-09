import { FINANCIAL_ROLE_LABELS } from './financialRoleLabels'
import type { ExpenseWithRelations } from '@/services/expenses'

/** "1 of 2 committee signatures" — or null when the expense isn't
 * currently mid-approval, so callers can skip rendering anything extra. */
export function quorumProgressLabel(expense: ExpenseWithRelations): string | null {
  if (expense.status !== 'SUBMITTED') return null
  const required = expense.required_approval_roles ?? []
  if (required.length === 0) return null
  const signed = new Set(
    expense.approvals.filter((a) => a.approval_cycle === expense.approval_cycle && a.action === 'APPROVE').map((a) => a.role_code),
  )
  const outstanding = required.filter((role) => !signed.has(role)).map((role) => FINANCIAL_ROLE_LABELS[role])
  return `${signed.size} of ${required.length} committee signatures — waiting on ${outstanding.join(', ')}`
}
