import { apiClient, type GetToken } from '@/lib/apiClient'
import type { Beneficiary } from '@/types'
import type { BeneficiaryFormValues } from '@/schemas/expense.schema'

export type BeneficiaryOption = Pick<Beneficiary, 'id' | 'display_name' | 'phone' | 'is_confidential'>

export async function pickBeneficiaries(getToken: GetToken, search: string): Promise<BeneficiaryOption[]> {
  const { rows } = await apiClient.get<{ rows: BeneficiaryOption[] }>('/api/beneficiaries', getToken, { action: 'picker', search })
  return rows
}

export async function createBeneficiary(getToken: GetToken, values: BeneficiaryFormValues): Promise<Beneficiary> {
  return apiClient.post('/api/beneficiaries', getToken, values)
}
