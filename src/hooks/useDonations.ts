import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSupabaseClient } from '@/contexts/SupabaseContext'
import { queryKeys } from '@/lib/queryKeys'
import * as donationsService from '@/services/donations'
import type { AdminDonationFilters } from '@/services/donations'
import type { DonationFormValues } from '@/schemas/donation.schema'

export function useMemberDonations(memberId: string | undefined) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.donations.forMember(memberId ?? ''),
    queryFn: () => donationsService.listDonationsForMember(client, memberId!),
    enabled: !!memberId,
  })
}

export function useAdminDonations(filters: AdminDonationFilters) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.donations.adminList(filters),
    queryFn: () => donationsService.listDonationsAdmin(client, filters),
    placeholderData: (prev) => prev,
  })
}

/** Creating a donation can flip a member off the pending-followups list and
 * change dashboard totals, so invalidation is intentionally broad. */
export function useCreateDonation(recordedBy: string) {
  const client = useSupabaseClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DonationFormValues) => donationsService.createDonation(client, values, recordedBy),
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.donations.forMember(values.member_id) })
      queryClient.invalidateQueries({ queryKey: ['donations', 'admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['followups', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}

export function useSoftDeleteDonation() {
  const client = useSupabaseClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, deletedBy, reason }: { id: string; deletedBy: string; reason: string }) =>
      donationsService.softDeleteDonation(client, id, deletedBy, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] })
      queryClient.invalidateQueries({ queryKey: ['followups', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}
