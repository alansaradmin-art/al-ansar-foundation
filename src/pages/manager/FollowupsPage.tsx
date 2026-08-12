import { useState } from 'react'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useAdminFollowups } from '@/hooks/useFollowups'
import { PeriodSelector } from '@/components/PeriodSelector'
import { CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { FollowupStatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'

export default function ManagerFollowupsPage() {
  const { period, setPeriod } = usePeriodSelector()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useAdminFollowups({
    month: period?.month,
    year: period?.year,
    page,
    pageSize: 20,
  })

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/manager/more">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="font-display text-lg font-semibold">Follow-up History</h1>
      </div>

      {period && (
        <div className="flex justify-center">
          <PeriodSelector period={period} onChange={setPeriod} />
        </div>
      )}

      {isLoading && <CardListSkeleton />}
      {isError && <ErrorState message="Unable to load follow-ups. Please try again." onRetry={refetch} />}
      {data && data.rows.length === 0 && (
        <EmptyState icon={<ClipboardList className="size-8" />} title="No follow-ups recorded for this month." />
      )}

      {data && data.rows.length > 0 && (
        <div className="space-y-2">
          {data.rows.map((f) => (
            <Link
              key={f.id}
              to={`/manager/members/${f.member_id}`}
              className="block space-y-1.5 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{f.member?.member_name ?? 'Unknown member'}</p>
                  {f.member?.father_name && (
                    <p className="text-xs text-muted-foreground">{f.member.father_name}</p>
                  )}
                </div>
                <FollowupStatusBadge status={f.follow_up_status} />
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(f.follow_up_date)}</p>
            </Link>
          ))}
        </div>
      )}

      {data && data.count > 20 && (
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(data.count / 20)}</span>
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
