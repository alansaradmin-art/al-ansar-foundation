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

export function useUpdateMember(id: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: MemberFormValues) => membersService.updateMember(getToken, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.members.detail(id) })
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
    },
  })
}

export function useReassignManager() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ memberIds, managerId }: { memberIds: string[]; managerId: string }) =>
      membersService.reassignManager(getToken, memberIds, managerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  })
}
