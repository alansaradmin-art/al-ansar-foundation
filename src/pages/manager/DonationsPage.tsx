import { useEffect } from 'react'
import { Receipt } from 'lucide-react'
import { useProfile } from '@/contexts/ProfileContext'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useAdminDonations } from '@/hooks/useDonations'
import { useManagerDashboard } from '@/hooks/useDashboard'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { DonationListItem } from '@/features/donations/DonationListItem'
import { RecordDonationDialog } from '@/features/donations/RecordDonationDialog'
import { ReceiptViewDialog } from '@/features/donations/receipt/ReceiptViewDialog'
import { formatINR, formatPeriod } from '@/lib/format'

export default function DonationsPage() {
  const { profile } = useProfile()
  const { period, setPeriod } = usePeriodSelector()
  const [filters, setFilters] = useUrlFilters({ page: 1 })
  const { page } = filters
  const { pageSize } = useDefaultPageSize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setFilters({ page: 1 }), [pageSize])
  const { data, isLoading, isError, refetch } = useAdminDonations({
    month: period?.month,
    year: period?.year,
    page,
    pageSize,
  })
  // Period total/count come from the dashboard RPC, not from summing the
  // current page's rows — that undercounts once a month has more than
  // one page of donations.
  const { data: stats } = useManagerDashboard(profile?.manager_id ?? undefined, period?.month, period?.year)
  const total = stats?.donation_amount ?? 0
  const count = stats?.donation_count ?? data?.count ?? 0

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
            {count} donation{count === 1 ? '' : 's'}
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
            <DonationListItem
              key={donation.id}
              donation={donation}
              memberHref={`/manager/members/${donation.member_id}`}
              actions={
                <ReceiptViewDialog
                  donation={donation}
                  member={donation.member}
                  recordedByName={donation.recorder?.full_name ?? profile?.full_name ?? 'Al Ansar Foundation'}
                />
              }
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
