import { apiClient, type GetToken } from '@/lib/apiClient'
import type { ExpensePaymentMethod } from '@/types'

// Served from api/expense-config.ts's ?resource=methods branch — see the
// comment at the top of that file.
export async function listPaymentMethods(getToken: GetToken, includeInactive = false): Promise<ExpensePaymentMethod[]> {
  const { rows } = await apiClient.get<{ rows: ExpensePaymentMethod[] }>('/api/expense-config', getToken, {
    resource: 'methods',
    includeInactive: includeInactive ? 'true' : undefined,
  })
  return rows
}
