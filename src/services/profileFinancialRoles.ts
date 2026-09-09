import { apiClient, type GetToken } from '@/lib/apiClient'
import type { ProfileFinancialRole, FinancialRoleCode } from '@/types'

export type ActiveFinancialRoleGrant = ProfileFinancialRole & {
  profile: { full_name: string; role: string; is_active: boolean } | null
}

// Served from api/expense-config.ts's ?resource=roles branch — see the
// comment at the top of that file.
export async function listActiveFinancialRoleGrants(getToken: GetToken): Promise<ActiveFinancialRoleGrant[]> {
  const { rows } = await apiClient.get<{ rows: ActiveFinancialRoleGrant[] }>('/api/expense-config', getToken, { resource: 'roles' })
  return rows
}

export async function grantFinancialRole(getToken: GetToken, profileId: string, roleCode: FinancialRoleCode): Promise<ProfileFinancialRole> {
  return apiClient.post(
    '/api/expense-config',
    getToken,
    { profile_id: profileId, role_code: roleCode },
    { resource: 'roles', action: 'grant' },
  )
}

export async function revokeFinancialRole(getToken: GetToken, id: string): Promise<ProfileFinancialRole> {
  return apiClient.post('/api/expense-config', getToken, undefined, { resource: 'roles', action: 'revoke', id })
}
