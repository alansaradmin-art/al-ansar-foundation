import { Link } from 'react-router-dom'
import { ChevronRight, Phone, UserRound } from 'lucide-react'
import {
  MemberStatusBadge,
  DonationStatusBadge,
  FollowupStatusBadge,
  PendingFollowupBadge,
  FollowupNotDueBadge,
} from '@/components/StatusBadge'
import { formatINR } from '@/lib/format'
import type { Member } from '@/types'
import type { MemberPeriodSummary } from '@/services/memberPeriod'

export function MemberCard({
  member,
  to,
  summary,
}: {
  member: Member
  to: string
  summary?: MemberPeriodSummary
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all md:hover:-translate-y-0.5 md:hover:border-primary/30 md:hover:shadow-md"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UserRound className="size-5" />
      </span>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium leading-tight">{member.member_name}</p>
          {member.status === 'INACTIVE' && <MemberStatusBadge status="INACTIVE" />}
        </div>
        <p className="text-xs text-muted-foreground">{member.member_id}</p>
        {member.mobile_number && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="size-3" />
            {member.mobile_number}
          </p>
        )}

        {summary && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <DonationStatusBadge
              received={summary.donationCount > 0}
              label={summary.donationCount > 0 ? formatINR(summary.donationTotal) : undefined}
            />
            {summary.hasCompletedFollowup ? (
              <FollowupStatusBadge status="COMPLETED" />
            ) : summary.isPending ? (
              <PendingFollowupBadge label="Follow-up Needed" />
            ) : summary.donationCount === 0 ? (
              <FollowupNotDueBadge />
            ) : null}
          </div>
        )}
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
