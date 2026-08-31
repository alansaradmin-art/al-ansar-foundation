import { useEffect, useRef } from 'react'
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
  // Only reset to page 1 on a genuine pageSize change, never on the first
  // render's loading-fallback-to-real-value jump — see admin/MembersPage.tsx's
  // matching comment for the full reasoning (that transition used to
  // silently reset the URL's own page back to 1 on every mount, breaking
  // "return to the exact page you left" whenever the configured default
  // page size wasn't exactly the fallback value of 10).
  const previousPageSizeRef = useRef<number | null>(null)
  useEffect(() => {
    if (previousPageSizeRef.current !== null && previousPageSizeRef.current !== pageSize) {
      setFilters({ page: 1 })
    }
    previousPageSizeRef.current = pageSize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize])
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

  // Previous/Next/a specific page number should never leave the reader
  // scrolled down into where the *previous* page's rows used to be —
  // scoped to actual pagination clicks only, not every filter change.
  function handlePageChange(nextPage: number) {
    setFilters({ page: nextPage })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
        <Pagination page={page} pageSize={pageSize} total={data.count} onPageChange={handlePageChange} />
      )}
    </div>
  )
}
