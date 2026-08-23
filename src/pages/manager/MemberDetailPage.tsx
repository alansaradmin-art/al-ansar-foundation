import { useParams } from 'react-router-dom'
import { useMember } from '@/hooks/useMembers'
import { useMemberDonations } from '@/hooks/useDonations'
import { useMemberFollowups } from '@/hooks/useFollowups'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { LoadingState, ErrorState } from '@/components/StateViews'
import { Member360View } from '@/features/members/Member360View'
import { MonthlyDonationSummary } from '@/features/donations/MonthlyDonationSummary'
import { AddDonationDialog } from '@/features/donations/AddDonationDialog'
import { AddFollowupDialog } from '@/features/followups/AddFollowupDialog'
import { FollowupWhatsAppActions } from '@/features/followups/FollowupWhatsAppActions'

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>()
  const { period, setPeriod } = usePeriodSelector()

  const { data: member, isLoading, isError, refetch } = useMember(memberId)
  const { data: donations = [], isLoading: isDonationsLoading } = useMemberDonations(memberId)
  const { data: followups = [], isLoading: isFollowupsLoading } = useMemberFollowups(memberId)

  if (isLoading) return <LoadingState label="Loading member…" />
  if (isError || !member) {
    return <ErrorState message="Unable to load this member. Please try again." onRetry={refetch} />
  }

  const periodDonations = period
    ? donations.filter((d) => d.donation_month === period.month && d.donation_year === period.year)
    : []

  return (
    <Member360View
      member={member}
      donations={donations}
      isDonationsLoading={isDonationsLoading}
      followups={followups}
      isFollowupsLoading={isFollowupsLoading}
      canDeleteDocuments={false}
      canEditFollowups
      periodSummary={
        period ? <MonthlyDonationSummary period={period} onPeriodChange={setPeriod} donations={periodDonations} /> : undefined
      }
      bottomActions={
        <>
          <FollowupWhatsAppActions member={member} />
          <AddDonationDialog memberId={member.id} />
          <AddFollowupDialog member={member} />
        </>
      }
    />
  )
}
