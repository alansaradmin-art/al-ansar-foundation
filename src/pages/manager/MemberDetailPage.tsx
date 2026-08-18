import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, UserRound, IdCard, IndianRupee, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMember } from '@/hooks/useMembers'
import { useMemberDonations } from '@/hooks/useDonations'
import { useMemberFollowups } from '@/hooks/useFollowups'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { queryKeys } from '@/lib/queryKeys'
import { LoadingState, ErrorState } from '@/components/StateViews'
import { CardListSkeleton } from '@/components/LoadingSkeletons'
import { MemberStatusBadge } from '@/components/StatusBadge'
import { MemberInfoCard } from '@/features/members/MemberInfoCard'
import { ContactSection } from '@/features/members/ContactSection'
import { AssignedManagerCard } from '@/features/members/AssignedManagerCard'
import { MonthlyDonationSummary } from '@/features/donations/MonthlyDonationSummary'
import { DonationHistoryList } from '@/features/donations/DonationHistoryList'
import { FollowupHistoryList } from '@/features/followups/FollowupHistoryList'
import { AddDonationDialog } from '@/features/donations/AddDonationDialog'
import { AddFollowupDialog } from '@/features/followups/AddFollowupDialog'

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
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

  // Switching to a tab refreshes that tab's own data — the fetch itself
  // happens once at this page's mount (see useMemberDonations/useMemberFollowups
  // above), so re-selecting a tab wouldn't otherwise pick up a donation/
  // follow-up recorded elsewhere in the same session without a full reload.
  const confirmedMemberId = member.id
  function handleTabChange(value: string) {
    if (value === 'donations') {
      queryClient.invalidateQueries({ queryKey: queryKeys.donations.forMember(confirmedMemberId) })
    }
    if (value === 'followups') {
      queryClient.invalidateQueries({ queryKey: queryKeys.followups.forMember(confirmedMemberId) })
    }
  }

  return (
    <div className="pb-32">
      <div className="flex items-center gap-3 p-4 pb-0">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
        </Button>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-lg font-semibold leading-tight">{member.member_name}</h1>
            {member.status === 'INACTIVE' && <MemberStatusBadge status="INACTIVE" />}
          </div>
          {member.father_name && <p className="text-xs text-muted-foreground">{member.father_name}</p>}
        </div>
      </div>

      <Tabs defaultValue="contact" className="mt-3 gap-0" onValueChange={handleTabChange}>
        <div className="sticky top-14 z-10 border-b bg-background/95 px-4 py-2 backdrop-blur">
          <TabsList className="w-full">
            <TabsTrigger value="contact">
              <IdCard className="size-4" /> Contact
            </TabsTrigger>
            <TabsTrigger value="donations">
              <IndianRupee className="size-4" /> Donations
            </TabsTrigger>
            <TabsTrigger value="followups">
              <ClipboardList className="size-4" /> Follow-ups
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="contact" className="space-y-4 p-4">
          <MemberInfoCard member={member} />
          <ContactSection member={member} />
          <AssignedManagerCard managerId={member.assigned_manager_id} />
        </TabsContent>

        <TabsContent value="donations" className="space-y-4 p-4">
          {period && (
            <MonthlyDonationSummary period={period} onPeriodChange={setPeriod} donations={periodDonations} />
          )}
          {isDonationsLoading ? <CardListSkeleton count={2} /> : <DonationHistoryList donations={donations} />}
        </TabsContent>

        <TabsContent value="followups" className="space-y-4 p-4">
          {isFollowupsLoading ? <CardListSkeleton count={2} /> : <FollowupHistoryList followups={followups} />}
        </TabsContent>
      </Tabs>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex gap-2 border-t bg-background/95 p-3 shadow-lg backdrop-blur">
        <AddDonationDialog memberId={member.id} />
        <AddFollowupDialog member={member} />
      </div>
    </div>
  )
}
