/** Client-computed "Action Type" filter options — each maps to an existing
 * entityType+action pair the API already understands (see api/_lib/auditLog.ts
 * for where these action strings come from: `${entityType}_created`/`_updated`).
 * No new backend param needed for this filter. `donations` is only ever
 * updated via the soft-delete path (api/donations.ts's ?action=softDelete),
 * and `monthly_followups` is only ever updated via continuing an open
 * STARTED/IN_PROGRESS attempt (api/followups.ts's ?action=update) — a
 * finished outcome is still immutable — so both map unambiguously to one
 * label each. */
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
  {
    value: 'monthly_followups_updated',
    label: 'Follow-up Updated',
    entityType: 'monthly_followups',
    action: 'monthly_followups_updated',
  },
  { value: 'managers_created', label: 'Manager Added', entityType: 'managers', action: 'managers_created' },
  { value: 'managers_updated', label: 'Manager Updated', entityType: 'managers', action: 'managers_updated' },
  {
    value: 'member_documents_created',
    label: 'Document Uploaded',
    entityType: 'member_documents',
    action: 'member_documents_created',
  },
  {
    value: 'member_documents_updated',
    label: 'Document Removed',
    entityType: 'member_documents',
    action: 'member_documents_updated',
  },
  // Receipt events (api/donations.ts's ?action=logReceiptEvent) — write-only
  // audit entries, entityType stays 'donations' since they're always about
  // one, but the action string is donations_receipt_<event> rather than
  // the usual _created/_updated so it can't collide with those.
  {
    value: 'donations_receipt_generated',
    label: 'Receipt Generated',
    entityType: 'donations',
    action: 'donations_receipt_generated',
  },
  {
    value: 'donations_receipt_viewed',
    label: 'Receipt Viewed',
    entityType: 'donations',
    action: 'donations_receipt_viewed',
  },
  {
    value: 'donations_receipt_downloaded',
    label: 'Receipt Downloaded',
    entityType: 'donations',
    action: 'donations_receipt_downloaded',
  },
  {
    value: 'donations_receipt_shared',
    label: 'Receipt Shared',
    entityType: 'donations',
    action: 'donations_receipt_shared',
  },
]

export function findActionTypeOption(value: string | undefined): ActionTypeOption | undefined {
  return ACTION_TYPE_OPTIONS.find((o) => o.value === value)
}
