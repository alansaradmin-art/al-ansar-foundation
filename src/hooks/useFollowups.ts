import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSupabaseClient } from '@/contexts/SupabaseContext'
import { queryKeys } from '@/lib/queryKeys'
import * as followupsService from '@/services/followups'
import type { AdminFollowupFilters } from '@/services/followups'
import type { FollowupFormValues } from '@/schemas/followup.schema'

export function useMemberFollowups(memberId: string | undefined) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.followups.forMember(memberId ?? ''),
    queryFn: () => followupsService.listFollowupsForMember(client, memberId!),
    enabled: !!memberId,
  })
}

export function usePendingFollowups(managerId: string | undefined, month: number | undefined, year: number | undefined) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.followups.pending(managerId, month ?? 0, year ?? 0),
    queryFn: () => followupsService.listPendingFollowups(client, managerId, month!, year!),
    enabled: month != null && year != null,
  })
}

export function useAdminFollowups(filters: AdminFollowupFilters) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.followups.adminList(filters),
    queryFn: () => followupsService.listFollowupsAdmin(client, filters),
    placeholderData: (prev) => prev,
  })
}

export function useCreateFollowup(managerId: string, createdBy: string) {
  const client = useSupabaseClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: FollowupFormValues) =>
      followupsService.createFollowup(client, values, managerId, createdBy),
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.followups.forMember(values.member_id) })
      queryClient.invalidateQueries({ queryKey: ['followups', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['followups', 'admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}
