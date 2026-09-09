import { apiClient, type GetToken } from '@/lib/apiClient'
import type { ExpenseCategory } from '@/types'

export async function listExpenseCategories(getToken: GetToken, includeInactive = false): Promise<ExpenseCategory[]> {
  const { rows } = await apiClient.get<{ rows: ExpenseCategory[] }>('/api/expense-categories', getToken, {
    includeInactive: includeInactive ? 'true' : undefined,
  })
  return rows
}
