import { apiClient, type GetToken } from '@/lib/apiClient'
import type { Fund } from '@/types'

export async function listFunds(getToken: GetToken, includeInactive = false): Promise<Fund[]> {
  const { rows } = await apiClient.get<{ rows: Fund[] }>('/api/funds', getToken, { includeInactive: includeInactive ? 'true' : undefined })
  return rows
}

export interface FundBalance {
  fund_id: string
  fund_code: string
  fund_name: string
  donations_total: number
  expenses_total: number
  balance: number
}

/** Donations − Paid Expenses, computed live per active fund — see
 * fund_balances_summary() in supabase/migrations/0042. */
export async function listFundBalances(getToken: GetToken): Promise<FundBalance[]> {
  const { rows } = await apiClient.get<{ rows: FundBalance[] }>('/api/funds', getToken, { action: 'balances' })
  return rows
}
