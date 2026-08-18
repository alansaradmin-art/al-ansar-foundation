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

export async function updateFollowup(
  getToken: GetToken,
  id: string,
  values: FollowupFormValues,
): Promise<MonthlyFollowup> {
  return apiClient.patch('/api/followups', getToken, values, { id, action: 'update' })
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

export interface OverdueFollowupRow {
  memberId: string
  memberName: string
  fatherName: string | null
  memberDisplayId: string
  assignedManagerId: string | null
  managerName: string | null
  lastFollowUpDate: string | null
  lastFollowUpStatus: FollowUpStatus | null
}

/** managerId = undefined -> Admin view across every manager. */
export async function listOverdueFollowups(
  getToken: GetToken,
  managerId: string | undefined,
  month: number,
  year: number,
): Promise<OverdueFollowupRow[]> {
  const { rows } = await apiClient.get<{
    rows: {
      member_id: string
      member_name: string
      father_name: string | null
      member_display_id: string
      assigned_manager_id: string | null
      manager_name: string | null
      last_follow_up_date: string | null
      last_follow_up_status: FollowUpStatus | null
    }[]
  }>('/api/followups', getToken, { action: 'overdue', managerId, month, year })
  return rows.map((r) => ({
    memberId: r.member_id,
    memberName: r.member_name,
    fatherName: r.father_name,
    memberDisplayId: r.member_display_id,
    assignedManagerId: r.assigned_manager_id,
    managerName: r.manager_name,
    lastFollowUpDate: r.last_follow_up_date,
    lastFollowUpStatus: r.last_follow_up_status,
  }))
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
  member: { member_name: string; member_id: string; father_name: string | null } | null
  manager: { full_name: string } | null
}

export async function listFollowupsAdmin(
  getToken: GetToken,
  filters: AdminFollowupFilters = {},
): Promise<PaginatedResult<FollowupWithRelations>> {
  return apiClient.get('/api/followups', getToken, { ...filters })
}
