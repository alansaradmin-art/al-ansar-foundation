import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { FollowupStatusBadge } from '@/components/StatusBadge'
import { formatDate, formatDateTime, formatINR } from '@/lib/format'
import { findActionTypeOption } from './ActionTypeOptions'
import { computeAuditDiff, type AuditFieldDiff } from './auditDiff'
import {
  CONTACTED_PERSON_TYPE_LABELS,
  DIFF_SKIP_FIELDS,
  FIELD_LABELS,
  FOLLOW_UP_METHOD_LABELS,
  PAYMENT_METHOD_LABELS,
} from './labels'
import type { AuditLogWithActor } from '@/services/auditLogs'
import type { ContactedPersonType, FollowUpMethod, FollowUpStatus, PaymentMethod } from '@/types'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function str(data: Record<string, unknown> | null, key: string): string | null {
  const v = data?.[key]
  return typeof v === 'string' && v ? v : null
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  )
}

function DonationDetail({ data }: { data: Record<string, unknown> }) {
  const amount = typeof data.amount_inr === 'number' ? data.amount_inr : Number(data.amount_inr) || 0
  const method = data.payment_method as PaymentMethod | undefined
  const reference = str(data, 'transaction_reference')
  const date = str(data, 'donation_date')
  const deletionReason = str(data, 'deletion_reason')

  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
      <Field label="Amount">
        <span className="font-display font-semibold tabular-nums">{formatINR(amount)}</span>
      </Field>
      {method && <Field label="Payment Method">{PAYMENT_METHOD_LABELS[method]}</Field>}
      {reference && <Field label="Reference">{reference}</Field>}
      {date && <Field label="Donation Date">{formatDate(date)}</Field>}
      {data.is_deleted === true && deletionReason && <Field label="Removal Reason">{deletionReason}</Field>}
    </dl>
  )
}

function FollowupDetail({ data, managerName }: { data: Record<string, unknown>; managerName: string | null }) {
  const status = data.follow_up_status as FollowUpStatus | undefined
  const method = data.follow_up_method as FollowUpMethod | undefined
  const contactedType = data.contacted_person_type as ContactedPersonType | undefined
  const date = str(data, 'follow_up_date')
  const contactName = str(data, 'contacted_person_name')
  const contactPhone = str(data, 'contacted_person_phone')
  const relationship = str(data, 'contacted_person_relationship')
  const remarks = str(data, 'remarks')
  const nextFollowUpDate = str(data, 'next_follow_up_date')

  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
      {date && <Field label="Follow-up Date">{formatDate(date)}</Field>}
      {nextFollowUpDate && <Field label="Next Follow-up">{formatDate(nextFollowUpDate)}</Field>}
      {status && (
        <Field label="Status">
          <FollowupStatusBadge status={status} />
        </Field>
      )}
      {method && <Field label="Method">{FOLLOW_UP_METHOD_LABELS[method]}</Field>}
      {contactedType && <Field label="Contacted">{CONTACTED_PERSON_TYPE_LABELS[contactedType]}</Field>}
      {contactName && <Field label="Contact Name">{contactName}</Field>}
      {contactPhone && <Field label="Contact Phone">{contactPhone}</Field>}
      {relationship && <Field label="Relationship">{relationship}</Field>}
      {managerName && <Field label="Manager">{managerName}</Field>}
      {remarks && (
        <div className="col-span-full">
          <Field label="Remarks">{remarks}</Field>
        </div>
      )}
    </dl>
  )
}

function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function DiffTable({ diffs }: { diffs: AuditFieldDiff[] }) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What changed</p>
      <div className="space-y-2">
        {diffs.map((d) => (
          <div
            key={d.field}
            className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-[minmax(0,10rem)_1fr_auto_1fr] sm:items-center sm:gap-2"
          >
            <span className="font-medium">{d.label}</span>
            <span className="text-muted-foreground line-through">{formatDiffValue(d.before)}</span>
            <span className="hidden text-muted-foreground sm:inline">→</span>
            <span className="font-medium text-foreground">{formatDiffValue(d.after)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const ACTION_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  members_created: 'secondary',
  members_updated: 'outline',
  donations_created: 'secondary',
  donations_updated: 'destructive',
  monthly_followups_created: 'secondary',
  monthly_followups_updated: 'outline',
  managers_created: 'secondary',
  managers_updated: 'outline',
  member_documents_created: 'secondary',
  member_documents_updated: 'destructive',
  donations_receipt_generated: 'secondary',
  donations_receipt_viewed: 'outline',
  donations_receipt_downloaded: 'outline',
  donations_receipt_shared: 'outline',
}

export function AuditLogEntry({
  log,
  hideMemberInfo = false,
}: {
  log: AuditLogWithActor
  /** Set when this entry is already rendered inside that same member's own
   * Member 360 page (the Activity Timeline tab) — the member-name header
   * line would just be a redundant self-reference there, and its link
   * always points at the admin member route, which a Manager can't open. */
  hideMemberInfo?: boolean
}) {
  const actionOption = findActionTypeOption(log.action)
  const isUpdate = log.action.endsWith('_updated')
  const data = asRecord(log.new_value) ?? asRecord(log.old_value)
  const diffs = isUpdate ? computeAuditDiff(asRecord(log.old_value), asRecord(log.new_value), DIFF_SKIP_FIELDS, FIELD_LABELS) : []

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1.5">
          <Badge variant={ACTION_BADGE_VARIANT[log.action] ?? 'outline'}>{actionOption?.label ?? log.action}</Badge>
          {!hideMemberInfo && log.memberName && (
            <p className="font-medium">
              {log.memberRowId ? (
                <Link to={`/admin/members/${log.memberRowId}`} className="hover:underline">
                  {log.memberName}
                  {log.memberFatherName ? ` (${log.memberFatherName})` : ''}
                </Link>
              ) : (
                <>
                  {log.memberName}
                  {log.memberFatherName ? ` (${log.memberFatherName})` : ''}
                </>
              )}
            </p>
          )}
        </div>
        <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(log.created_at)}</span>
      </div>

      <p className="text-xs text-muted-foreground">
        {log.actor?.full_name ?? 'System'}
        {log.actor?.role ? ` · ${log.actor.role === 'ADMIN' ? 'Admin' : 'Manager'}` : ''}
        {log.actor?.email ? ` · ${log.actor.email}` : ''}
      </p>

      {log.entity_type === 'donations' && data && <DonationDetail data={data} />}
      {log.entity_type === 'monthly_followups' && data && <FollowupDetail data={data} managerName={log.managerName} />}

      {isUpdate && diffs.length > 0 && <DiffTable diffs={diffs} />}
    </div>
  )
}
