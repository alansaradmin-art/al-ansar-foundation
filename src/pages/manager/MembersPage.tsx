import { useEffect } from 'react'
import { Users } from 'lucide-react'
import { useProfile } from '@/contexts/ProfileContext'
import { useMembers } from '@/hooks/useMembers'
import { useMemberPeriodSummaries } from '@/hooks/useMemberPeriodSummaries'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { MembersFilterBar } from '@/features/members/MembersFilterBar'
import { MemberCard } from '@/features/members/MemberCard'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import type { MemberStatus } from '@/types'

export default function MembersPage() {
  const { profile } = useProfile()
  const { period, setPeriod } = usePeriodSelector()
  const [filters, setFilters] = useUrlFilters({
    search: '',
    status: 'ACTIVE' as MemberStatus | 'ALL',
    page: 1,
  })
  const { search, status, page } = filters
  const debouncedSearch = useDebouncedValue(search)

  const { pageSize } = useDefaultPageSize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setFilters({ page: 1 }), [pageSize])
  const params = {
    managerId: profile!.manager_id!,
    search: debouncedSearch,
    status: status === 'ALL' ? undefined : status,
    page,
    pageSize,
  }
  const { data, isLoading, isError, refetch } = useMembers(params)
  const memberIds = data?.rows.map((m) => m.id) ?? []
  const { data: summaries } = useMemberPeriodSummaries(memberIds, period?.month, period?.year)

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="My Members"
        description={data ? `${data.count} member${data.count === 1 ? '' : 's'} assigned to you` : undefined}
        actions={period && <PeriodSelector period={period} onChange={setPeriod} />}
      />

      <MembersFilterBar
        search={search}
        onSearchChange={(v) => setFilters({ search: v, page: 1 })}
        status={status}
        onStatusChange={(v) => setFilters({ status: v, page: 1 })}
      />

      {isLoading && <CardListSkeleton />}
      {isError && <ErrorState message="Unable to load members. Please try again." onRetry={refetch} />}

      {data && data.rows.length === 0 && (
        <EmptyState
          icon={<Users className="size-8" />}
          title="No members assigned to you."
          description={debouncedSearch ? 'Try a different search.' : undefined}
        />
      )}

      {data && data.rows.length > 0 && (
        <div className="space-y-2">
          {data.rows.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              to={`/manager/members/${member.id}`}
              summary={summaries?.[member.id]}
            />
          ))}
        </div>
      )}

      {data && (
        <Pagination page={page} pageSize={pageSize} total={data.count} onPageChange={(p) => setFilters({ page: p })} />
      )}
    </div>
  )
}
