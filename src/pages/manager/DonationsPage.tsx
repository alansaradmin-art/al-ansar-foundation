import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useAdminDonations } from '@/hooks/useDonations'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { DonationListItem } from '@/features/donations/DonationListItem'
import { RecordDonationDialog } from '@/features/donations/RecordDonationDialog'
import { Button } from '@/components/ui/button'
import { formatINR, formatPeriod } from '@/lib/format'

export default function DonationsPage() {
  const { period, setPeriod } = usePeriodSelector()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useAdminDonations({
    month: period?.month,
    year: period?.year,
    page,
    pageSize: 20,
  })

  const total = data?.rows.reduce((sum, d) => sum + Number(d.amount_inr), 0) ?? 0

  return (
    <div className="space-y-4 p-4">
      <PageHeader title="Donations" actions={period && <PeriodSelector period={period} onChange={setPeriod} />} />

      {data && period && (
        <div className="flex items-center justify-between rounded-xl bg-primary px-4 py-3.5 text-primary-foreground shadow-sm">
          <div>
            <p className="text-xs text-primary-foreground/80">{formatPeriod(period.month, period.year)}</p>
            <p className="font-display text-xl font-semibold tabular-nums">{formatINR(total)}</p>
          </div>
          <p className="text-sm text-primary-foreground/80">
            {data.count} donation{data.count === 1 ? '' : 's'}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <RecordDonationDialog />
      </div>

      {isLoading && <CardListSkeleton />}
      {isError && <ErrorState message="Unable to load donations. Please try again." onRetry={refetch} />}

      {data && data.rows.length === 0 && (
        <EmptyState icon={<Receipt className="size-8" />} title="No donations recorded for this month." />
      )}

      {data && data.rows.length > 0 && (
        <div className="space-y-2">
          {data.rows.map((donation) => (
            <DonationListItem key={donation.id} donation={donation} memberHref={`/manager/members/${donation.member_id}`} />
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
