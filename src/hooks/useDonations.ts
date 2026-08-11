import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as donationsService from '@/services/donations'
import type { AdminDonationFilters } from '@/services/donations'
import type { DonationFormValues } from '@/schemas/donation.schema'

export function useMemberDonations(memberId: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.donations.forMember(memberId ?? ''),
    queryFn: () => donationsService.listDonationsForMember(getToken, memberId!),
    enabled: !!memberId,
  })
}

export function useAdminDonations(filters: AdminDonationFilters) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.donations.adminList(filters),
    queryFn: () => donationsService.listDonationsAdmin(getToken, filters),
    placeholderData: (prev) => prev,
  })
}

/** Creating a donation can flip a member off the pending-followups list and
 * change dashboard totals, so invalidation is intentionally broad. */
export function useCreateDonation(recordedBy: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: DonationFormValues) => donationsService.createDonation(getToken, values, recordedBy),
    onSuccess: (_data, values) => {
      // Anonymous donations (no member_id) have nothing member-specific to
      // invalidate here.
      if (values.member_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.donations.forMember(values.member_id) })
      }
      queryClient.invalidateQueries({ queryKey: ['donations', 'admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['followups', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}

export function useSoftDeleteDonation() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, deletedBy, reason }: { id: string; deletedBy: string; reason: string }) =>
      donationsService.softDeleteDonation(getToken, id, deletedBy, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] })
      queryClient.invalidateQueries({ queryKey: ['followups', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}
