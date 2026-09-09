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

/** Export CSV must never reuse the on-screen `data.rows` from
 * useAdminDonations directly — that's whatever one page of the list
 * happens to be showing (25 by default, or whatever the configured page
 * size is), so a month with more donations than that would silently
 * export an incomplete file. This issues its own one-off fetch for the
 * same filters with a generous ceiling instead of the display's own page
 * size, so the export always has everything currently matching the
 * selected month/manager/method/type filters, independent of pagination. */
export function useExportAdminDonations() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: (filters: Omit<AdminDonationFilters, 'page' | 'pageSize'>) =>
      donationsService.listDonationsAdmin(getToken, { ...filters, page: 1, pageSize: 10000 }),
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

/** Same broad invalidation as useCreateDonation — editing amount/date/
 * member can flip pending-followup status and every report total, for
 * both the old and new member, so tracking "old member id" through the
 * mutation isn't worth it over a blanket donations-prefix invalidation. */
export function useUpdateDonation() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: DonationFormValues }) =>
      donationsService.updateDonation(getToken, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] })
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
