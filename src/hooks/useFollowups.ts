import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as followupsService from '@/services/followups'
import type { AdminFollowupFilters } from '@/services/followups'
import type { FollowupFormValues } from '@/schemas/followup.schema'

export function useMemberFollowups(memberId: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.followups.forMember(memberId ?? ''),
    queryFn: () => followupsService.listFollowupsForMember(getToken, memberId!),
    enabled: !!memberId,
  })
}

export function usePendingFollowups(managerId: string | undefined, month: number | undefined, year: number | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.followups.pending(managerId, month ?? 0, year ?? 0),
    queryFn: () => followupsService.listPendingFollowups(getToken, managerId, month!, year!),
    enabled: month != null && year != null,
  })
}

export function useOverdueFollowups(managerId: string | undefined, month: number | undefined, year: number | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.followups.overdue(managerId, month ?? 0, year ?? 0),
    queryFn: () => followupsService.listOverdueFollowups(getToken, managerId, month!, year!),
    enabled: month != null && year != null,
  })
}

export function useAdminFollowups(filters: AdminFollowupFilters) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.followups.adminList(filters),
    queryFn: () => followupsService.listFollowupsAdmin(getToken, filters),
    placeholderData: (prev) => prev,
  })
}

export function useCreateFollowup(managerId: string, createdBy: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: FollowupFormValues) =>
      followupsService.createFollowup(getToken, values, managerId, createdBy),
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.followups.forMember(values.member_id) })
      queryClient.invalidateQueries({ queryKey: ['followups', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['followups', 'admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['member-period-summaries'] })
    },
  })
}

/** Same broad invalidation as useCreateFollowup, plus 'overdue' (an update
 * can move a member off the overdue list) and 'audit-logs' (Member 360's
 * Timeline tab, if already mounted). */
export function useUpdateFollowup() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: FollowupFormValues }) =>
      followupsService.updateFollowup(getToken, id, values),
    onSuccess: (_data, { values }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.followups.forMember(values.member_id) })
      queryClient.invalidateQueries({ queryKey: ['followups', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['followups', 'admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['followups', 'overdue'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['member-period-summaries'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
  })
}
