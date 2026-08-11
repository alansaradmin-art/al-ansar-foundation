import { useParams, useNavigate } from 'react-router-dom'
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
          <p className="text-xs text-muted-foreground">{member.member_id}</p>
        </div>
        <MemberFormDialog member={member} />
      </div>

      <MemberInfoCard member={member} />
      <ContactSection member={member} />
      <DonationHistoryList donations={donations} />
      <FollowupHistoryList followups={followups} />
    </div>
  )
}
