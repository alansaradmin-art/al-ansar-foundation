import { apiClient, type GetToken } from '@/lib/apiClient'
import type { Fund } from '@/types'

// Served from api/expense-config.ts's ?resource=funds branch, not its own
// endpoint — folded in to stay under Vercel's Hobby-plan serverless
// function cap (see the comment at the top of that file).
export async function listFunds(getToken: GetToken, includeInactive = false): Promise<Fund[]> {
  const { rows } = await apiClient.get<{ rows: Fund[] }>('/api/expense-config', getToken, {
    resource: 'funds',
    includeInactive: includeInactive ? 'true' : undefined,
  })
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
  const { rows } = await apiClient.get<{ rows: FundBalance[] }>('/api/expense-config', getToken, {
    resource: 'funds',
    action: 'balances',
  })
  return rows
}
