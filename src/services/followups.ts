import { apiClient, type GetToken } from '@/lib/apiClient'
import type { FollowUpStatus, Member, MonthlyFollowup, PaginatedResult } from '@/types'
import type { FollowupFormValues } from '@/schemas/followup.schema'

export async function listFollowupsForMember(getToken: GetToken, memberId: string): Promise<MonthlyFollowup[]> {
  const { rows } = await apiClient.get<{ rows: MonthlyFollowup[] }>('/api/followups', getToken, {
    action: 'forMember',
    memberId,
  })
  return rows
}

export async function createFollowup(
  getToken: GetToken,
  values: FollowupFormValues,
  managerId: string,
  createdBy: string,
): Promise<MonthlyFollowup> {
  // managerId/createdBy are accepted for call-site compatibility but the
  // server always forces manager_id/created_by from the caller's own
  // profile — see api/followups.ts.
  void managerId
  void createdBy
  return apiClient.post('/api/followups', getToken, values)
}

/** managerId = undefined -> Admin view across every manager. */
export async function listPendingFollowups(
  getToken: GetToken,
  managerId: string | undefined,
  month: number,
  year: number,
): Promise<Member[]> {
  const { rows } = await apiClient.get<{ rows: Member[] }>('/api/followups', getToken, {
    action: 'pending',
    managerId,
    month,
    year,
  })
  return rows
}

export interface AdminFollowupFilters {
  month?: number
  year?: number
  managerId?: string
  status?: FollowUpStatus
  page?: number
  pageSize?: number
}

export type FollowupWithRelations = MonthlyFollowup & {
  member: { member_name: string; member_id: string } | null
  manager: { full_name: string } | null
}

export async function listFollowupsAdmin(
  getToken: GetToken,
  filters: AdminFollowupFilters = {},
): Promise<PaginatedResult<FollowupWithRelations>> {
  return apiClient.get('/api/followups', getToken, { ...filters })
}
