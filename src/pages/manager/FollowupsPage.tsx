import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ClipboardList, PartyPopper } from 'lucide-react'
import { useProfile } from '@/contexts/ProfileContext'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useAdminFollowups, usePendingFollowups } from '@/hooks/useFollowups'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { PendingMemberCard } from '@/features/followups/PendingMemberCard'
import { FollowupListItem } from '@/features/followups/FollowupListItem'

export default function ManagerFollowupsPage() {
  const { profile } = useProfile()
  const queryClient = useQueryClient()
  const { period, setPeriod } = usePeriodSelector()
  const [filters, setFilters] = useUrlFilters({ tab: 'pending', historyPage: 1 })
  const { historyPage } = filters
  const tab = filters.tab === 'history' ? 'history' : 'pending'
  const { pageSize } = useDefaultPageSize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setFilters({ historyPage: 1 }), [pageSize])

  // Both tabs' data is fetched once at page mount (see the two useQuery
  // calls below) — switching tabs re-fetches that tab's own data so a
  // follow-up recorded elsewhere in the same session shows up without a
  // full reload.
  function handleTabChange(value: string) {
    setFilters({ tab: value })
    if (value === 'pending') queryClient.invalidateQueries({ queryKey: ['followups', 'pending'] })
    if (value === 'history') queryClient.invalidateQueries({ queryKey: ['followups', 'admin-list'] })
  }

  const {
    data: pendingMembers,
    isLoading: isPendingLoading,
    isError: isPendingError,
    refetch: refetchPending,
  } = usePendingFollowups(profile?.manager_id ?? undefined, period?.month, period?.year)

  const {
    data: history,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    refetch: refetchHistory,
  } = useAdminFollowups({ month: period?.month, year: period?.year, page: historyPage, pageSize })

  return (
    <div className="space-y-4 p-4">
      <PageHeader title="Follow-ups" actions={period && <PeriodSelector period={period} onChange={setPeriod} />} />

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="w-full">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 pt-3">
          {isPendingLoading && <CardListSkeleton />}
          {isPendingError && (
            <ErrorState message="Unable to load pending follow-ups. Please try again." onRetry={refetchPending} />
          )}
          {pendingMembers && pendingMembers.length === 0 && (
            <EmptyState
              icon={<PartyPopper className="size-8" />}
              title="Great work!"
              description="You have completed all follow-ups for this month."
            />
          )}
          {pendingMembers && pendingMembers.length > 0 && (
            <div className="space-y-3">
              {pendingMembers.map((member) => (
                <PendingMemberCard key={member.id} member={member} memberHref={`/manager/members/${member.id}`} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 pt-3">
          {isHistoryLoading && <CardListSkeleton />}
          {isHistoryError && (
            <ErrorState message="Unable to load follow-ups. Please try again." onRetry={refetchHistory} />
          )}
          {history && history.rows.length === 0 && (
            <EmptyState icon={<ClipboardList className="size-8" />} title="No follow-ups recorded for this month." />
          )}
          {history && history.rows.length > 0 && (
            <div className="space-y-2">
              {history.rows.map((f) => (
                <FollowupListItem key={f.id} followup={f} href={`/manager/members/${f.member_id}`} />
              ))}
            </div>
          )}
          {history && (
            <Pagination
              page={historyPage}
              pageSize={pageSize}
              total={history.count}
              onPageChange={(p) => setFilters({ historyPage: p })}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
