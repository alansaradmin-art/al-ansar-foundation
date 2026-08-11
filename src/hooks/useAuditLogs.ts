import { useQuery } from '@tanstack/react-query'
import { useSupabaseClient } from '@/contexts/SupabaseContext'
import { queryKeys } from '@/lib/queryKeys'
import { listAuditLogs, type AuditLogFilters } from '@/services/auditLogs'

export function useAuditLogs(filters: AuditLogFilters) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.auditLogs.list(filters),
    queryFn: () => listAuditLogs(client, filters),
    placeholderData: (prev) => prev,
  })
}
