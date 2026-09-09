import { apiClient, type GetToken } from '@/lib/apiClient'
import type { AuditLog, FollowUpMethod, FollowUpStatus, PaymentMethod, PaginatedResult, Role } from '@/types'

export interface AuditLogFilters {
  entityType?: string
  action?: string
  page?: number
  pageSize?: number
  dateFrom?: string
  dateTo?: string
  actorProfileId?: string
  memberId?: string
  followUpStatus?: FollowUpStatus
  followUpMethod?: FollowUpMethod
  paymentMethod?: PaymentMethod
}

export type AuditLogWithActor = AuditLog & {
  actor: { full_name: string; email: string; role: Role } | null
  memberName: string | null
  memberDisplayId: string | null
  memberFatherName: string | null
  memberRowId: string | null
  managerName: string | null
}

// Served from api/settings.ts's ?resource=auditLogs branch, not its own
// endpoint — folded in to stay under Vercel's Hobby-plan serverless
// function cap (see the comment at the top of that file's handler()).
export async function listAuditLogs(
  getToken: GetToken,
  filters: AuditLogFilters = {},
): Promise<PaginatedResult<AuditLogWithActor>> {
  return apiClient.get('/api/settings', getToken, { resource: 'auditLogs', ...filters })
}

export interface AuditLogActor {
  id: string
  full_name: string
  role: Role
}

export async function listAuditLogActors(getToken: GetToken): Promise<AuditLogActor[]> {
  const { rows } = await apiClient.get<{ rows: AuditLogActor[] }>('/api/settings', getToken, {
    resource: 'auditLogs',
    action: 'actors',
  })
  return rows
}
