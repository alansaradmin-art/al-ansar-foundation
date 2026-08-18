import { FollowupStatusBadge } from '@/components/StatusBadge'
import { formatDate } from '@/lib/format'
import type { MonthlyFollowup } from '@/types'

const METHOD_LABELS: Record<string, string> = {
  PHONE: 'Phone',
  WHATSAPP: 'WhatsApp',
  IN_PERSON: 'In Person',
  OTHER: 'Other',
}

/** The existing-record summary shown inside DuplicateConfirmDialog for a
 * possible-duplicate follow-up. */
export function FollowupDuplicateSummary({ followup }: { followup: MonthlyFollowup }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{formatDate(followup.follow_up_date)}</p>
        <FollowupStatusBadge status={followup.follow_up_status} />
      </div>
      {followup.follow_up_method && (
        <p className="text-muted-foreground">{METHOD_LABELS[followup.follow_up_method]}</p>
      )}
      {followup.remarks && <p className="text-muted-foreground">{followup.remarks}</p>}
    </>
  )
}
