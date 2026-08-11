import type { AppSupabaseClient } from '@/lib/supabase'
import type { AuditLog, PaginatedResult } from '@/types'

export interface AuditLogFilters {
  entityType?: string
  action?: string
  page?: number
  pageSize?: number
}

export type AuditLogWithActor = AuditLog & { actor: { full_name: string; email: string } | null }

export async function listAuditLogs(
  client: AppSupabaseClient,
  filters: AuditLogFilters = {},
): Promise<PaginatedResult<AuditLogWithActor>> {
  const { entityType, action, page = 1, pageSize = 25 } = filters
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('audit_logs')
    .select('*, actor:profiles(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (entityType) query = query.eq('entity_type', entityType)
  if (action) query = query.eq('action', action)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { rows: (data ?? []) as unknown as AuditLogWithActor[], count: count ?? 0 }
}
