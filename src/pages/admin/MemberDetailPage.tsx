import { useParams } from 'react-router-dom'
import { useMember } from '@/hooks/useMembers'
import { useMemberDonations } from '@/hooks/useDonations'
import { useMemberFollowups } from '@/hooks/useFollowups'
import { LoadingState, ErrorState } from '@/components/StateViews'
import { Member360View } from '@/features/members/Member360View'
import { MemberFormDialog } from '@/features/members/MemberFormDialog'
import { AssignManagerDialog } from '@/features/members/AssignManagerDialog'
import { StatusButton } from '@/features/members/AdminMemberRow'
import { AddDonationDialog } from '@/features/donations/AddDonationDialog'

export default function AdminMemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>()

  const { data: member, isLoading, isError, refetch } = useMember(memberId)
  const { data: donations = [], isLoading: isDonationsLoading } = useMemberDonations(memberId)
  const { data: followups = [], isLoading: isFollowupsLoading } = useMemberFollowups(memberId)

  if (isLoading) return <LoadingState label="Loading member…" />
  if (isError || !member) {
    return <ErrorState message="Unable to load this member. Please try again." onRetry={refetch} />
  }

  return (
    <Member360View
      member={member}
      donations={donations}
      isDonationsLoading={isDonationsLoading}
      followups={followups}
      isFollowupsLoading={isFollowupsLoading}
      canDeleteDocuments
      headerActions={
        <>
          <StatusButton member={member} />
          <MemberFormDialog member={member} />
          {!member.assigned_manager_id && <AssignManagerDialog member={member} />}
          <AddDonationDialog memberId={member.id} variant="outline" size="sm" className="" />
        </>
      }
    />
  )
}
