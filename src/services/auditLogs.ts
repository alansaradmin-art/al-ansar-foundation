import { apiClient, type GetToken } from '@/lib/apiClient'
import type { AuditLog, PaginatedResult } from '@/types'

export interface AuditLogFilters {
  entityType?: string
  action?: string
  page?: number
  pageSize?: number
}

export type AuditLogWithActor = AuditLog & { actor: { full_name: string; email: string } | null }

export async function listAuditLogs(
  getToken: GetToken,
  filters: AuditLogFilters = {},
): Promise<PaginatedResult<AuditLogWithActor>> {
  return apiClient.get('/api/audit-logs', getToken, { ...filters })
}
