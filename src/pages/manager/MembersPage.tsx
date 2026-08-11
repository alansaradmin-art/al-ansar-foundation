import { useState } from 'react'
import { Users } from 'lucide-react'
import { useProfile } from '@/contexts/ProfileContext'
import { useMembers } from '@/hooks/useMembers'
import { useMemberPeriodSummaries } from '@/hooks/useMemberPeriodSummaries'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { MembersFilterBar } from '@/features/members/MembersFilterBar'
import { MemberCard } from '@/features/members/MemberCard'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { Button } from '@/components/ui/button'
import type { MemberStatus } from '@/types'

export default function MembersPage() {
  const { profile } = useProfile()
  const { period, setPeriod } = usePeriodSelector()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<MemberStatus | 'ALL'>('ACTIVE')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)

  const params = {
    managerId: profile!.manager_id!,
    search: debouncedSearch,
    status: status === 'ALL' ? undefined : status,
    page,
    pageSize: 20,
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
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        status={status}
        onStatusChange={(v) => {
          setStatus(v)
          setPage(1)
        }}
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

      {data && data.count > 20 && (
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(data.count / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(data.count / 20)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
