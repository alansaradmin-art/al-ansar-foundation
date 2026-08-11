export interface AuditFieldDiff {
  field: string
  label: string
  before: unknown
  after: unknown
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  // Postgres numeric/boolean columns can round-trip through jsonb as
  // string vs number/boolean across old_value vs new_value snapshots
  // taken via different code paths — compare loosely for primitives.
  if (a == null || b == null) return a == b
  if (typeof a !== typeof b) return String(a) === String(b)
  return false
}

/** Changed-fields-only diff between two full-row snapshots. Fields present
 * in `skipFields` are always excluded (see labels.ts's DIFF_SKIP_FIELDS for
 * why each one is there) — everything else that actually changed is
 * reported, labeled via `fieldLabels` (falling back to the raw key). */
export function computeAuditDiff(
  oldValue: Record<string, unknown> | null | undefined,
  newValue: Record<string, unknown> | null | undefined,
  skipFields: Set<string>,
  fieldLabels: Record<string, string>,
): AuditFieldDiff[] {
  if (!oldValue || !newValue) return []

  const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)])
  const diffs: AuditFieldDiff[] = []

  for (const field of keys) {
    if (skipFields.has(field)) continue
    const before = oldValue[field]
    const after = newValue[field]
    if (valuesEqual(before, after)) continue
    diffs.push({ field, label: fieldLabels[field] ?? field, before, after })
  }

  return diffs
}
