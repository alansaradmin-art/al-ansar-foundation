import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as dashboardService from '@/services/dashboard'
import type { DonationEngagementParams } from '@/services/dashboard'
import type { DonationType } from '@/types'

export function useManagerDashboard(managerId: string | undefined, month: number | undefined, year: number | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.dashboard.manager(managerId ?? '', month ?? 0, year ?? 0),
    queryFn: () => dashboardService.getManagerDashboardStats(getToken, managerId!, month!, year!),
    enabled: !!managerId && month != null && year != null,
  })
}

export function useAdminDashboard(month: number | undefined, year: number | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.dashboard.admin(month ?? 0, year ?? 0),
    queryFn: () => dashboardService.getAdminDashboardStats(getToken, month!, year!),
    enabled: month != null && year != null,
  })
}

export function useManagerWiseReport(month: number | undefined, year: number | undefined, donationType?: DonationType) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.dashboard.managerWiseReport(month ?? 0, year ?? 0, donationType),
    queryFn: () => dashboardService.getManagerWiseReport(getToken, month!, year!, donationType),
    enabled: month != null && year != null,
  })
}

export function useMonthWiseReport(year: number | undefined, donationType?: DonationType) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.dashboard.monthWiseReport(year ?? 0, donationType),
    queryFn: () => dashboardService.getMonthWiseReport(getToken, year!, donationType),
    enabled: year != null,
  })
}

export function useMemberGrowthTrend(year: number | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.dashboard.memberGrowthTrend(year ?? 0),
    queryFn: () => dashboardService.getMemberGrowthTrend(getToken, year!),
    enabled: year != null,
  })
}

/** params === undefined means "not ready yet" (e.g. Custom Range selected
 * but no range picked) — the query stays disabled until a caller has a
 * real filter to send. */
export function useDonationEngagementReport(params: DonationEngagementParams | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.dashboard.donationEngagement(params ?? {}),
    queryFn: () => dashboardService.getDonationEngagementReport(getToken, params!),
    enabled: !!params,
  })
}

export function useMonthlyDonationReport(month: number | undefined, year: number | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.dashboard.monthlyDonationReport(month ?? 0, year ?? 0),
    queryFn: () => dashboardService.getMonthlyDonationReport(getToken, month!, year!),
    enabled: month != null && year != null,
  })
}
