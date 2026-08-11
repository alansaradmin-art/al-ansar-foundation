import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { listAuditLogs, listAuditLogActors, type AuditLogFilters } from '@/services/auditLogs'

export function useAuditLogs(filters: AuditLogFilters) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.auditLogs.list(filters),
    queryFn: () => listAuditLogs(getToken, filters),
    placeholderData: (prev) => prev,
  })
}

/** Rarely changes (profiles are added/deactivated, not churned) — long
 * staleTime avoids refetching this on every filter-bar interaction. */
export function useAuditLogActors() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.auditLogs.actors,
    queryFn: () => listAuditLogActors(getToken),
    staleTime: 5 * 60_000,
  })
}
