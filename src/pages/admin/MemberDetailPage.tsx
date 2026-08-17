import { useParams, useNavigate } from 'react-router-dom'
import { differenceInCalendarMonths } from 'date-fns'
import { ArrowLeft, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMember } from '@/hooks/useMembers'
import { useMemberDonations } from '@/hooks/useDonations'
import { useMemberFollowups } from '@/hooks/useFollowups'
import { LoadingState, ErrorState } from '@/components/StateViews'
import { MemberStatusBadge } from '@/components/StatusBadge'
import { MemberInfoCard } from '@/features/members/MemberInfoCard'
import { ContactSection } from '@/features/members/ContactSection'
import { DonationHistoryList } from '@/features/donations/DonationHistoryList'
import { FollowupHistoryList } from '@/features/followups/FollowupHistoryList'
import { MemberFormDialog } from '@/features/members/MemberFormDialog'
import { StatusButton } from '@/features/members/AdminMemberRow'
import { formatDate } from '@/lib/format'

export default function AdminMemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>()
  const navigate = useNavigate()

  const { data: member, isLoading, isError, refetch } = useMember(memberId)
  const { data: donations = [] } = useMemberDonations(memberId)
  const { data: followups = [] } = useMemberFollowups(memberId)

  if (isLoading) return <LoadingState label="Loading member…" />
  if (isError || !member) {
    return <ErrorState message="Unable to load this member. Please try again." onRetry={refetch} />
  }

  // donations is already sorted donation_date desc and excludes deleted
  // rows (see api/donations.ts's ?action=forMember), so [0] is the latest
  // valid donation, if any. Mirrors stale_active_member_ids()'s reference
  // date (latest donation, falling back to join date) purely for display.
  const latestDonationDate = donations[0]?.donation_date
  const monthsInactive = differenceInCalendarMonths(new Date(), new Date(latestDonationDate ?? member.created_at))

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
        </Button>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-lg font-semibold leading-tight">{member.member_name}</h1>
            <MemberStatusBadge status={member.status} />
          </div>
          {member.father_name && <p className="text-xs text-muted-foreground">{member.father_name}</p>}
          {member.status === 'INACTIVE' && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {latestDonationDate ? `Last donation: ${formatDate(latestDonationDate)}` : 'Never donated'} ·{' '}
              {monthsInactive} month{monthsInactive === 1 ? '' : 's'} inactive
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <StatusButton member={member} />
          <MemberFormDialog member={member} />
        </div>
      </div>

      <MemberInfoCard member={member} />
      <ContactSection member={member} />
      <DonationHistoryList donations={donations} />
      <FollowupHistoryList followups={followups} />
    </div>
  )
}
