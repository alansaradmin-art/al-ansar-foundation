import { useProfile } from '@/contexts/ProfileContext'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { usePendingFollowups } from '@/hooks/useFollowups'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { PendingMemberCard } from '@/features/followups/PendingMemberCard'
import { PartyPopper } from 'lucide-react'

export default function PendingPage() {
  const { profile } = useProfile()
  const { period, setPeriod } = usePeriodSelector()
  const { data: members, isLoading, isError, refetch } = usePendingFollowups(
    profile?.manager_id ?? undefined,
    period?.month,
    period?.year,
  )

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Pending Follow-ups"
        description={
          members
            ? `${members.length} member${members.length === 1 ? '' : 's'} require${members.length === 1 ? 's' : ''} attention`
            : undefined
        }
        actions={period && <PeriodSelector period={period} onChange={setPeriod} />}
      />

      {isLoading && <CardListSkeleton />}
      {isError && <ErrorState message="Unable to load pending follow-ups. Please try again." onRetry={refetch} />}

      {members && members.length === 0 && (
        <EmptyState
          icon={<PartyPopper className="size-8" />}
          title="Great work!"
          description="You have completed all follow-ups for this month."
        />
      )}

      {members && members.length > 0 && (
        <div className="space-y-3">
          {members.map((member) => (
            <PendingMemberCard key={member.id} member={member} memberHref={`/manager/members/${member.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
