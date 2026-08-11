/** Client-computed "Action Type" filter options — each maps to an existing
 * entityType+action pair the API already understands (see api/_lib/auditLog.ts
 * for where these action strings come from: `${entityType}_created`/`_updated`).
 * No new backend param needed for this filter. `monthly_followups` is
 * create-only (api/followups.ts has no PATCH/PUT) and `donations` is only
 * ever updated via the soft-delete path (api/donations.ts's
 * ?action=softDelete), so both map unambiguously to one label each. */
export interface ActionTypeOption {
  value: string
  label: string
  entityType: string
  action: string
}

export const ACTION_TYPE_OPTIONS: ActionTypeOption[] = [
  { value: 'members_created', label: 'Member Added', entityType: 'members', action: 'members_created' },
  { value: 'members_updated', label: 'Member Updated', entityType: 'members', action: 'members_updated' },
  { value: 'donations_created', label: 'Donation Added', entityType: 'donations', action: 'donations_created' },
  { value: 'donations_updated', label: 'Donation Removed', entityType: 'donations', action: 'donations_updated' },
  {
    value: 'monthly_followups_created',
    label: 'Follow-up Recorded',
    entityType: 'monthly_followups',
    action: 'monthly_followups_created',
  },
  { value: 'managers_created', label: 'Manager Added', entityType: 'managers', action: 'managers_created' },
  { value: 'managers_updated', label: 'Manager Updated', entityType: 'managers', action: 'managers_updated' },
]

export function findActionTypeOption(value: string | undefined): ActionTypeOption | undefined {
  return ACTION_TYPE_OPTIONS.find((o) => o.value === value)
}
