import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FollowupStatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/StateViews'
import { formatDate } from '@/lib/format'
import type { MonthlyFollowup } from '@/types'

const CONTACTED_LABELS: Record<string, string> = {
  MEMBER: 'Member',
  ADDED_BY: 'Added By',
  REFERENCE_CONTACT: 'Reference Contact',
  OTHER: 'Other',
}

const METHOD_LABELS: Record<string, string> = {
  PHONE: 'Phone',
  WHATSAPP: 'WhatsApp',
  IN_PERSON: 'In Person',
  OTHER: 'Other',
}

function FollowupRow({ followup: f }: { followup: MonthlyFollowup }) {
  const contactedLabel = f.contacted_person_type === 'OTHER' ? f.contacted_person_name || 'Other' : CONTACTED_LABELS[f.contacted_person_type ?? 'OTHER']

  return (
    <li className="space-y-1.5 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{formatDate(f.follow_up_date)}</p>
        <FollowupStatusBadge status={f.follow_up_status} />
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-muted-foreground sm:grid-cols-3">
        {f.follow_up_method && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">Method</dt>
            <dd className="text-foreground">{METHOD_LABELS[f.follow_up_method]}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">Contacted</dt>
          <dd className="text-foreground">{contactedLabel}</dd>
        </div>
        {f.contacted_person_phone && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">Contact Number</dt>
            <dd className="text-foreground">{f.contacted_person_phone}</dd>
          </div>
        )}
        {f.contacted_person_relationship && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">Relationship</dt>
            <dd className="text-foreground">{f.contacted_person_relationship}</dd>
          </div>
        )}
      </dl>
      {f.remarks && <p className="text-sm text-muted-foreground">{f.remarks}</p>}
      {f.next_follow_up_date && (
        <p className="text-xs font-medium text-gold-foreground">Next follow-up: {formatDate(f.next_follow_up_date)}</p>
      )}
    </li>
  )
}

export function FollowupHistoryList({
  followups,
  showTitle = true,
}: {
  followups: MonthlyFollowup[]
  showTitle?: boolean
}) {
  const body = followups.length === 0 ? (
    <EmptyState title="No follow-ups recorded for this member." />
  ) : (
    <ul className="divide-y">
      {followups.map((f) => (
        <FollowupRow key={f.id} followup={f} />
      ))}
    </ul>
  )

  if (!showTitle) return body

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Follow-up History</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  )
}
