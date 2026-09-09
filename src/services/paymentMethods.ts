import { apiClient, type GetToken } from '@/lib/apiClient'
import type { ExpensePaymentMethod } from '@/types'

export async function listPaymentMethods(getToken: GetToken, includeInactive = false): Promise<ExpensePaymentMethod[]> {
  const { rows } = await apiClient.get<{ rows: ExpensePaymentMethod[] }>('/api/payment-methods', getToken, {
    includeInactive: includeInactive ? 'true' : undefined,
  })
  return rows
}
