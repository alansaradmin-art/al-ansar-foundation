import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as membersService from '@/services/members'
import type { ListMembersParams } from '@/services/members'
import type { MemberStatus } from '@/types'
import type { MemberFormValues } from '@/schemas/member.schema'

export function useMembers(params: ListMembersParams) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.members.list(params),
    queryFn: () => membersService.listMembers(getToken, params),
    placeholderData: (prev) => prev,
  })
}

export function useMember(id: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.members.detail(id ?? ''),
    queryFn: () => membersService.getMemberById(getToken, id!),
    enabled: !!id,
  })
}

export function useUnassignedMembersCount() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.members.unassignedCount,
    queryFn: () => membersService.getUnassignedMembersCount(getToken),
  })
}

export function useIncompleteMembersCount() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.members.incompleteCount,
    queryFn: () => membersService.getIncompleteMembersCount(getToken),
  })
}

export function useMemberLastDonationDates(memberIds: string[]) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.members.lastDonationDates(memberIds),
    queryFn: () => membersService.getMemberLastDonationDates(getToken, memberIds),
    enabled: memberIds.length > 0,
  })
}

export function useMemberPicker(query: string) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.members.picker(query),
    queryFn: () => membersService.searchMembersForPicker(getToken, query),
  })
}

export function useCreateMember() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: MemberFormValues) => membersService.createMember(getToken, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  })
}

/** Pending/Overdue/History follow-up lists are all filtered by the
 * member's current assigned_manager_id and status (see
 * list_pending_followups()/admin_overdue_followups() — both take
 * assigned_manager_id and require status='ACTIVE') — any mutation that
 * can change either one must invalidate these too, or a manager's
 * already-cached Pending list keeps showing a member who was just
 * reassigned away from them (or deactivated) until the cache naturally
 * expires or the page is hard-reloaded. Mirrors the exact prefixes
 * useCreateFollowup already invalidates. */
function invalidateFollowupLists(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['followups', 'pending'] })
  queryClient.invalidateQueries({ queryKey: ['followups', 'overdue'] })
  queryClient.invalidateQueries({ queryKey: ['followups', 'admin-list'] })
}

export function useUpdateMember(id: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: MemberFormValues) => membersService.updateMember(getToken, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.members.detail(id) })
      // Editing a member can change assigned_manager_id or status.
      invalidateFollowupLists(queryClient)
    },
  })
}

export function useSetMemberStatus() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MemberStatus }) =>
      membersService.setMemberStatus(getToken, id, status),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.members.detail(id) })
      invalidateFollowupLists(queryClient)
    },
  })
}

export function useReassignManager() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ memberIds, managerId }: { memberIds: string[]; managerId: string }) =>
      membersService.reassignManager(getToken, memberIds, managerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      invalidateFollowupLists(queryClient)
    },
  })
}
