import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database'

export type AuditEntityType = 'members' | 'donations' | 'monthly_followups' | 'managers' | 'member_documents'

interface WriteAuditLogParams {
  actorProfileId: string | null
  action: string
  entityType: AuditEntityType
  entityId: string
  oldValue?: unknown
  newValue?: unknown
}

/** Replaces the old write_audit_log() Postgres trigger (dropped in
 * supabase/migrations/0011_drop_audit_triggers.sql — it derived its actor
 * from auth.jwt(), which is empty now that nothing browser-side talks to
 * Supabase). The API layer already knows exactly who the caller is (their
 * verified Clerk session -> profile), so it writes the audit row itself
 * right after each mutation succeeds.
 *
 * Never throws: an audit-log failure must never block the user-facing
 * mutation it's describing from succeeding — this is a low-traffic admin
 * tool, and a lost audit row (logged here for Vercel's function logs) is a
 * far smaller problem than a member/donation edit silently failing to save
 * because of an unrelated logging hiccup. */
export async function writeAuditLog(
  supabase: SupabaseClient<Database>,
  params: WriteAuditLogParams,
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    actor_profile_id: params.actorProfileId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    old_value: (params.oldValue ?? null) as Record<string, unknown> | null,
    new_value: (params.newValue ?? null) as Record<string, unknown> | null,
  })
  if (error) {
    console.error('[audit-log] failed to write', params, error)
  }
}

/** Matches the old trigger's `<table>_created` action-name format exactly,
 * so AuditLogsPage's existing action filter values keep working unchanged. */
export function logInsert(
  supabase: SupabaseClient<Database>,
  entityType: AuditEntityType,
  actorProfileId: string | null,
  row: { id: string },
): Promise<void> {
  return writeAuditLog(supabase, {
    actorProfileId,
    action: `${entityType}_created`,
    entityType,
    entityId: row.id,
    newValue: row,
  })
}

/** Postgres/PostgREST can't return both pre- and post-images from one
 * UPDATE...RETURNING — callers must select('*').eq('id', id).single() the
 * row BEFORE issuing the update, matching what the old trigger captured
 * automatically via `to_jsonb(old)`. */
export function logUpdate(
  supabase: SupabaseClient<Database>,
  entityType: AuditEntityType,
  actorProfileId: string | null,
  oldRow: { id: string },
  newRow: { id: string },
): Promise<void> {
  return writeAuditLog(supabase, {
    actorProfileId,
    action: `${entityType}_updated`,
    entityType,
    entityId: newRow.id,
    oldValue: oldRow,
    newValue: newRow,
  })
}
