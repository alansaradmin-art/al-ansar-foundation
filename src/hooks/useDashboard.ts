import { useQuery } from '@tanstack/react-query'
import { useSupabaseClient } from '@/contexts/SupabaseContext'
import { queryKeys } from '@/lib/queryKeys'
import * as dashboardService from '@/services/dashboard'

export function useManagerDashboard(managerId: string | undefined, month: number | undefined, year: number | undefined) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.dashboard.manager(managerId ?? '', month ?? 0, year ?? 0),
    queryFn: () => dashboardService.getManagerDashboardStats(client, managerId!, month!, year!),
    enabled: !!managerId && month != null && year != null,
  })
}

export function useAdminDashboard(month: number | undefined, year: number | undefined) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.dashboard.admin(month ?? 0, year ?? 0),
    queryFn: () => dashboardService.getAdminDashboardStats(client, month!, year!),
    enabled: month != null && year != null,
  })
}

export function useManagerWiseReport(month: number | undefined, year: number | undefined) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.dashboard.managerWiseReport(month ?? 0, year ?? 0),
    queryFn: () => dashboardService.getManagerWiseReport(client, month!, year!),
    enabled: month != null && year != null,
  })
}

export function useMonthWiseReport(year: number | undefined) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.dashboard.monthWiseReport(year ?? 0),
    queryFn: () => dashboardService.getMonthWiseReport(client, year!),
    enabled: year != null,
  })
}
