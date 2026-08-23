import type { ReactNode } from 'react'
import {
  CheckCircle2,
  Circle,
  CircleSlash,
  Clock,
  PhoneCall,
  PlayCircle,
  Hourglass,
  XCircle,
  IndianRupee,
  UserX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FollowUpStatus, MemberStatus } from '@/types'

type Tone = 'success' | 'warning' | 'info' | 'neutral'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  info: 'bg-teal text-teal-foreground',
  neutral: 'bg-muted text-muted-foreground',
}

/**
 * The one status-badge primitive for the whole app — every status
 * everywhere (member, donation, follow-up) renders through this, so tone
 * and shape stay consistent. Icon + text always together: status is never
 * conveyed by color alone.
 */
function Badge({ label, tone, icon }: { label: string; tone: Tone; icon: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium leading-none whitespace-nowrap',
        TONE_CLASSES[tone],
      )}
    >
      {icon}
      {label}
    </span>
  )
}

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return status === 'ACTIVE' ? (
    <Badge label="Active" tone="success" icon={<CheckCircle2 className="size-3.5" />} />
  ) : (
    <Badge label="Inactive" tone="neutral" icon={<CircleSlash className="size-3.5" />} />
  )
}

/** "Not received" is deliberately neutral, never a warning color — donations
 * are voluntary, so an absence of one is not a problem to flag red/amber. */
export function DonationStatusBadge({ received, label }: { received: boolean; label?: string }) {
  return received ? (
    <Badge label={label ?? 'Donation Received'} tone="success" icon={<IndianRupee className="size-3.5" />} />
  ) : (
    <Badge label={label ?? 'No Donation Recorded'} tone="neutral" icon={<Circle className="size-3.5" />} />
  )
}

/** A donation recorded with no member attached (Admin-only — see
 * AnonymousDonationDialog.tsx). Neutral tone, same as every other
 * non-alarming identity/state badge in this file — this is a normal,
 * intentional record type, not a problem to flag. */
export function AnonymousDonationBadge() {
  return <Badge label="Anonymous Donation" tone="neutral" icon={<UserX className="size-3.5" />} />
}

const FOLLOW_UP_CONFIG: Record<FollowUpStatus, { label: string; tone: Tone; icon: ReactNode }> = {
  STARTED: { label: 'Started', tone: 'info', icon: <PlayCircle className="size-3.5" /> },
  IN_PROGRESS: { label: 'In Progress', tone: 'warning', icon: <Hourglass className="size-3.5" /> },
  COMPLETED: { label: 'Completed', tone: 'success', icon: <CheckCircle2 className="size-3.5" /> },
  NOT_INTERESTED: { label: 'Not Interested', tone: 'neutral', icon: <XCircle className="size-3.5" /> },
  CALLBACK_REQUIRED: { label: 'Callback Required', tone: 'info', icon: <PhoneCall className="size-3.5" /> },
}

export function FollowupStatusBadge({ status }: { status: FollowUpStatus }) {
  const config = FOLLOW_UP_CONFIG[status]
  return <Badge label={config.label} tone={config.tone} icon={config.icon} />
}

/** The dynamically-computed "needs a follow-up this month" state — not a
 * stored status, so it gets its own badge rather than living in
 * FOLLOW_UP_CONFIG. Warning tone (amber), never destructive/red: this is a
 * to-do, not a fault. Only ever render this when the server's
 * is_pending_followup() rule actually says so — never derive it from
 * "follow-up not completed yet" alone, since a donation received this
 * month, or simply not being past the cutoff day yet, both mean "not
 * pending" even with no completed follow-up on file. */
export function PendingFollowupBadge({ label = 'Follow-up Required' }: { label?: string }) {
  return <Badge label={label} tone="warning" icon={<Clock className="size-3.5" />} />
}

/** Before the cutoff day (or once a donation already covers the month), a
 * member with no completed follow-up isn't "pending" — just not due for
 * the amber treatment yet. */
export function FollowupNotDueBadge() {
  return <Badge label="Follow-up not completed" tone="neutral" icon={<Circle className="size-3.5" />} />
}

/** Active member with no donation in the trailing 3-month window (see
 * members_needing_attention() in supabase/migrations) — an Admin Dashboard
 * "needs attention" signal, warning tone like PendingFollowupBadge since
 * it's also a to-do rather than a fault. */
export function NoRecentDonationBadge() {
  return <Badge label="No Recent Donation" tone="warning" icon={<IndianRupee className="size-3.5" />} />
}

/** A member with no assigned_manager_id — warning tone like every other
 * "needs action" badge in this file, not destructive/red: this is a to-do
 * for Admin, not a fault in the member's record. */
export function UnassignedManagerBadge() {
  return <Badge label="Unassigned" tone="warning" icon={<UserX className="size-3.5" />} />
}
