import { authenticate, getServiceRoleClient, requireAdmin } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import type { Database, FollowUpStatus, FollowUpMethod, PaymentMethod } from '../src/types/database'

type AuditRow = Database['public']['Tables']['audit_logs']['Row']

interface EnrichedAuditRow extends AuditRow {
  actor: { full_name: string; email: string; role: string } | null
  memberName: string | null
  memberDisplayId: string | null
  memberFatherName: string | null
  memberRowId: string | null
  managerName: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function stringField(row: Record<string, unknown> | null, key: string): string | null {
  const value = row?.[key]
  return typeof value === 'string' ? value : null
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed.')

  const profile = await authenticate(req, res)
  if (!profile) return
  if (!requireAdmin(res, profile)) return
  const supabase = getServiceRoleClient()

  try {
    // GET /api/audit-logs?action=actors — the data source for the
    // "Manager/User" filter. Deliberately includes inactive profiles too:
    // a deactivated manager's historical audit entries must stay
    // filterable by name, not disappear from the picker.
    if (readQueryParam(req, 'action') === 'actors') {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('role')
        .order('full_name')
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    const entityType = readQueryParam(req, 'entityType')
    const action = readQueryParam(req, 'action')
    const dateFrom = readQueryParam(req, 'dateFrom')
    const dateTo = readQueryParam(req, 'dateTo')
    const actorProfileId = readQueryParam(req, 'actorProfileId')
    const memberId = readQueryParam(req, 'memberId')
    const followUpStatus = readQueryParam(req, 'followUpStatus') as FollowUpStatus | undefined
    const followUpMethod = readQueryParam(req, 'followUpMethod') as FollowUpMethod | undefined
    const paymentMethod = readQueryParam(req, 'paymentMethod') as PaymentMethod | undefined
    const page = Number(readQueryParam(req, 'page') ?? '1')
    const pageSize = Number(readQueryParam(req, 'pageSize') ?? '25')
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('audit_logs')
      .select('*, actor:profiles(full_name, email, role)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (entityType) query = query.eq('entity_type', entityType)
    if (action) query = query.eq('action', action)
    // created_at is timestamptz — send an explicit IST offset so a
    // date-only pick compares against the same day the UI displays
    // (formatDateTime renders everything in Asia/Kolkata), not a UTC day.
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00+05:30`)
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59.999+05:30`)
    if (actorProfileId) query = query.eq('actor_profile_id', actorProfileId)
    if (followUpStatus) query = query.eq('new_value->>follow_up_status', followUpStatus)
    if (followUpMethod) query = query.eq('new_value->>follow_up_method', followUpMethod)
    if (paymentMethod) query = query.eq('new_value->>payment_method', paymentMethod)
    if (memberId) {
      query = query.or(
        `and(entity_type.eq.members,entity_id.eq.${memberId}),and(entity_type.in.(donations,monthly_followups),new_value->>member_id.eq.${memberId})`,
      )
    }

    const { data, error, count } = await query.range(from, to)
    if (error) return sendSupabaseError(res, error)
    const rows = data ?? []

    // Resolve member_id/manager_id (UUIDs inside old_value/new_value) to
    // human-readable names — batched, not per-row, to avoid N+1.
    const memberIds = new Set<string>()
    const managerIds = new Set<string>()
    for (const row of rows) {
      const newVal = asRecord(row.new_value)
      const oldVal = asRecord(row.old_value)
      if (row.entity_type === 'donations' || row.entity_type === 'monthly_followups') {
        const id = stringField(newVal, 'member_id') ?? stringField(oldVal, 'member_id')
        if (id) memberIds.add(id)
      }
      if (row.entity_type === 'monthly_followups') {
        const id = stringField(newVal, 'manager_id') ?? stringField(oldVal, 'manager_id')
        if (id) managerIds.add(id)
      }
      if (row.entity_type === 'members') {
        const newMgr = stringField(newVal, 'assigned_manager_id')
        const oldMgr = stringField(oldVal, 'assigned_manager_id')
        if (newMgr) managerIds.add(newMgr)
        if (oldMgr) managerIds.add(oldMgr)
      }
    }

    const [membersResult, managersResult] = await Promise.all([
      memberIds.size > 0
        ? supabase.from('members').select('id, member_name, member_id, father_name').in('id', [...memberIds])
        : Promise.resolve({
            data: [] as { id: string; member_name: string; member_id: string; father_name: string | null }[],
            error: null,
          }),
      managerIds.size > 0
        ? supabase.from('managers').select('id, full_name').in('id', [...managerIds])
        : Promise.resolve({ data: [] as { id: string; full_name: string }[], error: null }),
    ])
    if (membersResult.error) return sendSupabaseError(res, membersResult.error)
    if (managersResult.error) return sendSupabaseError(res, managersResult.error)

    const memberById = new Map((membersResult.data ?? []).map((m) => [m.id, m]))
    const managerById = new Map((managersResult.data ?? []).map((m) => [m.id, m]))

    const enriched: EnrichedAuditRow[] = rows.map((row) => {
      const newVal = asRecord(row.new_value)
      const oldVal = asRecord(row.old_value)

      let memberRowId: string | null = null
      let managerId: string | null = null
      // For a manager-reassignment diff, resolve BOTH sides of
      // assigned_manager_id directly inside the returned old_value/new_value
      // (replacing the raw uuid with the manager's name) so the frontend's
      // generic before/after diff renderer needs no special-casing for this
      // one field — it just sees readable text on both sides already.
      let outNewVal = newVal
      let outOldVal = oldVal

      if (row.entity_type === 'members') {
        memberRowId = row.entity_id
        managerId = stringField(newVal, 'assigned_manager_id') ?? stringField(oldVal, 'assigned_manager_id')

        const newMgrId = stringField(newVal, 'assigned_manager_id')
        const oldMgrId = stringField(oldVal, 'assigned_manager_id')
        if (newVal && 'assigned_manager_id' in newVal) {
          outNewVal = { ...newVal, assigned_manager_id: newMgrId ? (managerById.get(newMgrId)?.full_name ?? newMgrId) : null }
        }
        if (oldVal && 'assigned_manager_id' in oldVal) {
          outOldVal = { ...oldVal, assigned_manager_id: oldMgrId ? (managerById.get(oldMgrId)?.full_name ?? oldMgrId) : null }
        }
      } else if (row.entity_type === 'donations' || row.entity_type === 'monthly_followups') {
        memberRowId = stringField(newVal, 'member_id') ?? stringField(oldVal, 'member_id')
        if (row.entity_type === 'monthly_followups') {
          managerId = stringField(newVal, 'manager_id') ?? stringField(oldVal, 'manager_id')
        }
      }

      const member = memberRowId ? memberById.get(memberRowId) : undefined
      const manager = managerId ? managerById.get(managerId) : undefined

      return {
        ...row,
        old_value: outOldVal,
        new_value: outNewVal,
        actor: (row as unknown as { actor: EnrichedAuditRow['actor'] }).actor,
        memberName: member?.member_name ?? null,
        memberDisplayId: member?.member_id ?? null,
        memberFatherName: member?.father_name ?? null,
        memberRowId: memberRowId ?? null,
        managerName: manager?.full_name ?? null,
      }
    })

    return sendJson(res, 200, { rows: enriched, count: count ?? 0 })
  } catch (error) {
    console.error('[api/audit-logs]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
