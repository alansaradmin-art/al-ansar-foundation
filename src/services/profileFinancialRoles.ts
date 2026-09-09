import { apiClient, type GetToken } from '@/lib/apiClient'
import type { ProfileFinancialRole, FinancialRoleCode } from '@/types'

export type ActiveFinancialRoleGrant = ProfileFinancialRole & {
  profile: { full_name: string; role: string; is_active: boolean } | null
}

export async function listActiveFinancialRoleGrants(getToken: GetToken): Promise<ActiveFinancialRoleGrant[]> {
  const { rows } = await apiClient.get<{ rows: ActiveFinancialRoleGrant[] }>('/api/profile-financial-roles', getToken)
  return rows
}

export async function grantFinancialRole(getToken: GetToken, profileId: string, roleCode: FinancialRoleCode): Promise<ProfileFinancialRole> {
  return apiClient.post('/api/profile-financial-roles', getToken, { profile_id: profileId, role_code: roleCode }, { action: 'grant' })
}

export async function revokeFinancialRole(getToken: GetToken, id: string): Promise<ProfileFinancialRole> {
  return apiClient.post('/api/profile-financial-roles', getToken, undefined, { action: 'revoke', id })
}
