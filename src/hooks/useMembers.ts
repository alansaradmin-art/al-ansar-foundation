import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSupabaseClient } from '@/contexts/SupabaseContext'
import { queryKeys } from '@/lib/queryKeys'
import * as membersService from '@/services/members'
import type { ListMembersParams } from '@/services/members'
import type { MemberStatus } from '@/types'
import type { MemberFormValues } from '@/schemas/member.schema'

export function useMembers(params: ListMembersParams) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.members.list(params),
    queryFn: () => membersService.listMembers(client, params),
    placeholderData: (prev) => prev,
  })
}

export function useMember(id: string | undefined) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.members.detail(id ?? ''),
    queryFn: () => membersService.getMemberById(client, id!),
    enabled: !!id,
  })
}

export function useMemberPicker(query: string) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.members.picker(query),
    queryFn: () => membersService.searchMembersForPicker(client, query),
  })
}

export function useCreateMember() {
  const client = useSupabaseClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: MemberFormValues) => membersService.createMember(client, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  })
}

export function useUpdateMember(id: string) {
  const client = useSupabaseClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: MemberFormValues) => membersService.updateMember(client, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.members.detail(id) })
    },
  })
}

export function useSetMemberStatus() {
  const client = useSupabaseClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MemberStatus }) =>
      membersService.setMemberStatus(client, id, status),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.members.detail(id) })
    },
  })
}

export function useReassignManager() {
  const client = useSupabaseClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ memberIds, managerId }: { memberIds: string[]; managerId: string }) =>
      membersService.reassignManager(client, memberIds, managerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  })
}
