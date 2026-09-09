import { apiClient, type GetToken } from '@/lib/apiClient'
import type { Beneficiary } from '@/types'
import type { BeneficiaryFormValues } from '@/schemas/expense.schema'

export type BeneficiaryOption = Pick<Beneficiary, 'id' | 'display_name' | 'phone' | 'is_confidential'>

// Served from api/expenses.ts's ?resource=beneficiaries branch, not its
// own endpoint — folded in to stay under Vercel's Hobby-plan serverless
// function cap (see the comment at the top of that file's handler()).
export async function pickBeneficiaries(getToken: GetToken, search: string): Promise<BeneficiaryOption[]> {
  const { rows } = await apiClient.get<{ rows: BeneficiaryOption[] }>('/api/expenses', getToken, {
    resource: 'beneficiaries',
    action: 'picker',
    search,
  })
  return rows
}

export async function createBeneficiary(getToken: GetToken, values: BeneficiaryFormValues): Promise<Beneficiary> {
  return apiClient.post('/api/expenses', getToken, values, { resource: 'beneficiaries' })
}
