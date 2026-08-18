import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, PartyPopper } from 'lucide-react'
import { useProfile } from '@/contexts/ProfileContext'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useAdminFollowups, usePendingFollowups } from '@/hooks/useFollowups'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { FollowupStatusBadge } from '@/components/StatusBadge'
import { PendingMemberCard } from '@/features/followups/PendingMemberCard'
import { formatDate } from '@/lib/format'

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

export default function ManagerFollowupsPage() {
  const { profile } = useProfile()
  const { period, setPeriod } = usePeriodSelector()
  const [historyPage, setHistoryPage] = useState(1)
  const { pageSize } = useDefaultPageSize()
  useEffect(() => setHistoryPage(1), [pageSize])

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

      <Tabs defaultValue="pending">
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
                <Link
                  key={f.id}
                  to={`/manager/members/${f.member_id}`}
                  className="block space-y-1.5 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{f.member?.member_name ?? 'Unknown member'}</p>
                      {f.member?.father_name && <p className="text-xs text-muted-foreground">{f.member.father_name}</p>}
                    </div>
                    <FollowupStatusBadge status={f.follow_up_status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(f.follow_up_date)}
                    {f.follow_up_method && ` · ${METHOD_LABELS[f.follow_up_method]}`}
                    {' · '}
                    {f.contacted_person_type === 'OTHER'
                      ? f.contacted_person_name || 'Other'
                      : CONTACTED_LABELS[f.contacted_person_type ?? 'OTHER']}
                  </p>
                  {f.remarks && <p className="text-sm text-muted-foreground">{f.remarks}</p>}
                </Link>
              ))}
            </div>
          )}
          {history && <Pagination page={historyPage} pageSize={pageSize} total={history.count} onPageChange={setHistoryPage} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
