import { apiClient, type GetToken } from '@/lib/apiClient'
import type { ExpenseCategory } from '@/types'

// Served from api/expense-config.ts's ?resource=categories branch — see
// the comment at the top of that file.
export async function listExpenseCategories(getToken: GetToken, includeInactive = false): Promise<ExpenseCategory[]> {
  const { rows } = await apiClient.get<{ rows: ExpenseCategory[] }>('/api/expense-config', getToken, {
    resource: 'categories',
    includeInactive: includeInactive ? 'true' : undefined,
  })
  return rows
}
