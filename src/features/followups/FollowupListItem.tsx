import { Link } from 'react-router-dom'
import { FollowupStatusBadge } from '@/components/StatusBadge'
import { formatDate } from '@/lib/format'
import type { FollowupWithRelations } from '@/services/followups'

const METHOD_LABELS: Record<string, string> = {
  PHONE: 'Phone',
  WHATSAPP: 'WhatsApp',
  IN_PERSON: 'In Person',
  OTHER: 'Other',
}

const CONTACTED_LABELS: Record<string, string> = {
  MEMBER: 'Member',
  ADDED_BY: 'Added By',
  REFERENCE_CONTACT: 'Reference Contact',
  OTHER: 'Other',
}

/** The mobile-card view of a follow-up history row — reused by both
 * Manager's own Follow-ups history (showManager=false, they already know
 * it's theirs) and Admin's cross-manager Follow-ups history
 * (showManager=true), alongside each page's `md:hidden`/`hidden md:block`
 * desktop-table split. */
export function FollowupListItem({
  followup: f,
  href,
  showManager = false,
}: {
  followup: FollowupWithRelations
  href: string
  showManager?: boolean
}) {
  return (
    <Link
      to={href}
      className="block space-y-1.5 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{f.member?.member_name ?? 'Unknown member'}</p>
          {f.member?.father_name && <p className="text-xs text-muted-foreground">{f.member.father_name}</p>}
        </div>
        <FollowupStatusBadge status={f.follow_up_status} />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatDate(f.follow_up_date)}
        {showManager && f.manager?.full_name && ` · ${f.manager.full_name}`}
        {f.follow_up_method && ` · ${METHOD_LABELS[f.follow_up_method]}`}
        {' · '}
        {f.contacted_person_type === 'OTHER'
          ? f.contacted_person_name || 'Other'
          : CONTACTED_LABELS[f.contacted_person_type ?? 'OTHER']}
      </p>
      {f.remarks && <p className="text-sm text-muted-foreground">{f.remarks}</p>}
      {f.next_follow_up_date && (
        <p className="text-xs font-medium text-gold-foreground">Next follow-up: {formatDate(f.next_follow_up_date)}</p>
      )}
    </Link>
  )
}
