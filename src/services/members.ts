import { apiClient, ApiError, type GetToken } from '@/lib/apiClient'
import type { Member, MemberStatus, PaginatedResult } from '@/types'
import type { MemberFormValues } from '@/schemas/member.schema'

export interface ListMembersParams {
  managerId?: string
  unassigned?: boolean
  incomplete?: boolean
  search?: string
  status?: MemberStatus
  page?: number
  pageSize?: number
}

export async function listMembers(getToken: GetToken, params: ListMembersParams = {}): Promise<PaginatedResult<Member>> {
  const { unassigned, incomplete, ...rest } = params
  return apiClient.get('/api/members', getToken, {
    ...rest,
    ...(unassigned ? { unassigned: 'true' } : {}),
    ...(incomplete ? { incomplete: 'true' } : {}),
  })
}

export async function getMemberById(getToken: GetToken, id: string): Promise<Member | null> {
  try {
    return await apiClient.get<Member>('/api/members', getToken, { id })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function searchMembersForPicker(getToken: GetToken, query: string, limit = 10) {
  const { rows } = await apiClient.get<{
    rows: Pick<Member, 'id' | 'member_id' | 'member_name' | 'father_name' | 'mobile_number' | 'mobile_country'>[]
  }>(
    '/api/members',
    getToken,
    { action: 'picker', search: query, limit },
  )
  return rows
}

export async function createMember(getToken: GetToken, values: MemberFormValues): Promise<Member> {
  return apiClient.post('/api/members', getToken, values)
}

export async function updateMember(getToken: GetToken, id: string, values: MemberFormValues): Promise<Member> {
  return apiClient.put('/api/members', getToken, values, { id })
}

export async function setMemberStatus(getToken: GetToken, id: string, status: MemberStatus): Promise<void> {
  await apiClient.patch('/api/members', getToken, { status }, { id, action: 'status' })
}

export async function reassignManager(getToken: GetToken, memberIds: string[], managerId: string): Promise<void> {
  await apiClient.post('/api/members', getToken, { memberIds, managerId }, { action: 'reassign' })
}

export async function countMembersForManager(getToken: GetToken, managerId: string): Promise<number> {
  const { count } = await apiClient.get<{ count: number }>('/api/members', getToken, { action: 'count', managerId })
  return count
}

export async function getUnassignedMembersCount(getToken: GetToken): Promise<number> {
  const { count } = await apiClient.get<{ count: number }>('/api/members', getToken, { action: 'unassignedCount' })
  return count
}

export async function getIncompleteMembersCount(getToken: GetToken): Promise<number> {
  const { count } = await apiClient.get<{ count: number }>('/api/members', getToken, { action: 'incompleteCount' })
  return count
}

export async function getMemberLastDonationDates(
  getToken: GetToken,
  memberIds: string[],
): Promise<Record<string, string | null>> {
  return apiClient.post('/api/members', getToken, { memberIds }, { action: 'lastDonationDates' })
}
