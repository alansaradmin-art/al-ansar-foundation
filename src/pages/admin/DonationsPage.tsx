import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useAdminDonations } from '@/hooks/useDonations'
import { useManagers } from '@/hooks/useManagers'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { TableSkeleton, CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { SoftDeleteDonationDialog } from '@/features/donations/SoftDeleteDonationDialog'
import { EditDonationDialog } from '@/features/donations/EditDonationDialog'
import { RecordDonationDialog } from '@/features/donations/RecordDonationDialog'
import { AnonymousDonationDialog } from '@/features/donations/AnonymousDonationDialog'
import { DonationListItem } from '@/features/donations/DonationListItem'
import { AnonymousDonationBadge } from '@/components/StatusBadge'
import { formatDate, formatINR, formatMobileNumber } from '@/lib/format'
import { toCsv, downloadCsv } from '@/lib/csv'
import { DONATION_TYPES, PAYMENT_METHODS } from '@/schemas/donation.schema'
import type { DonationType, PaymentMethod } from '@/types'
import type { DonationWithRelations } from '@/services/donations'

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  ONLINE: 'Online',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
}

const DONATION_TYPE_LABELS: Record<string, string> = {
  ZAKAT: 'Zakat',
  SADAQAH: 'Sadaqah/Sadka',
  FITRA: 'Fitra',
  GENERAL: 'General Donation',
  OTHER: 'Other',
}

export default function AdminDonationsPage() {
  const { period, setPeriod } = usePeriodSelector()
  const [filters, setFilters] = useUrlFilters({
    managerId: 'ALL',
    paymentMethod: 'ALL' as PaymentMethod | 'ALL',
    donationType: 'ALL' as DonationType | 'ALL',
    page: 1,
  })
  const { managerId, paymentMethod, donationType, page } = filters

  const { data: managers = [] } = useManagers()
  const { pageSize } = useDefaultPageSize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setFilters({ page: 1 }), [pageSize])
  const { data, isLoading, isError, refetch } = useAdminDonations({
    month: period?.month,
    year: period?.year,
    managerId: managerId === 'ALL' ? undefined : managerId,
    paymentMethod: paymentMethod === 'ALL' ? undefined : paymentMethod,
    donationType: donationType === 'ALL' ? undefined : donationType,
    page,
    pageSize,
  })

  function handleExport() {
    if (!data) return
    const csv = toCsv<DonationWithRelations>(data.rows, [
      { key: 'donation_date', label: 'Donation Date', value: (r) => r.donation_date },
      { key: 'member', label: 'Member', value: (r) => r.member?.member_name ?? 'Anonymous' },
      { key: 'father_name', label: "Father's Name", value: (r) => r.member?.father_name ?? '' },
      { key: 'mobile', label: 'Mobile Number', value: (r) => formatMobileNumber(r.member?.mobile_number) },
      { key: 'type', label: 'Donation Type', value: (r) => DONATION_TYPE_LABELS[r.donation_type] },
      { key: 'amount', label: 'Amount (INR)', value: (r) => r.amount_inr },
      { key: 'method', label: 'Payment Method', value: (r) => PAYMENT_LABELS[r.payment_method] },
      { key: 'ref', label: 'Transaction Reference', value: (r) => r.transaction_reference ?? '' },
      { key: 'recorded_by', label: 'Recorded By', value: (r) => r.recorder?.full_name ?? '' },
    ])
    downloadCsv(`donations-${period?.year}-${period?.month}.csv`, csv)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Donations"
        description={data ? `${data.count} donation${data.count === 1 ? '' : 's'} recorded` : undefined}
        actions={period && <PeriodSelector period={period} onChange={setPeriod} />}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={managerId} onValueChange={(v) => setFilters({ managerId: v })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All managers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All managers</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentMethod} onValueChange={(v) => setFilters({ paymentMethod: v as PaymentMethod | 'ALL' })}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All methods</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {PAYMENT_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={donationType} onValueChange={(v) => setFilters({ donationType: v as DonationType | 'ALL' })}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {DONATION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {DONATION_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExport} disabled={!data || data.rows.length === 0} className="ml-auto">
          <Download className="size-4" /> Export CSV
        </Button>
        <RecordDonationDialog />
        <AnonymousDonationDialog />
      </div>

      {isLoading && (
        <>
          <div className="md:hidden">
            <CardListSkeleton />
          </div>
          <div className="hidden md:block">
            <TableSkeleton cols={7} />
          </div>
        </>
      )}
      {isError && <ErrorState message="Unable to load donations. Please try again." onRetry={refetch} />}
      {data && data.rows.length === 0 && <EmptyState title="No donations recorded for this month." />}

      {data && data.rows.length > 0 && (
        <>
          <div className="space-y-2 md:hidden">
            {data.rows.map((donation) => (
              <DonationListItem
                key={donation.id}
                donation={donation}
                memberHref={donation.member_id ? `/admin/members/${donation.member_id}` : undefined}
                actions={
                  <>
                    <EditDonationDialog donation={donation} />
                    <SoftDeleteDonationDialog donationId={donation.id} />
                  </>
                }
              />
            ))}
          </div>

          <Table className="hidden md:block">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((donation) => (
                <TableRow key={donation.id} className="border-b last:border-0">
                  <TableCell className="whitespace-nowrap">{formatDate(donation.donation_date)}</TableCell>
                  <TableCell>
                    {donation.member ? (
                      <>
                        <Link to={`/admin/members/${donation.member_id}`} className="font-medium hover:underline">
                          {donation.member.member_name}
                        </Link>
                        {(() => {
                          const subline = [donation.member.father_name, formatMobileNumber(donation.member.mobile_number)]
                            .filter(Boolean)
                            .join(' · ')
                          return subline && <p className="text-xs text-muted-foreground">{subline}</p>
                        })()}
                      </>
                    ) : (
                      <AnonymousDonationBadge />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{DONATION_TYPE_LABELS[donation.donation_type]}</Badge>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">{formatINR(donation.amount_inr)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{PAYMENT_LABELS[donation.payment_method]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{donation.transaction_reference || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{donation.recorder?.full_name ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <EditDonationDialog donation={donation} />
                      <SoftDeleteDonationDialog donationId={donation.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {data && (
        <Pagination page={page} pageSize={pageSize} total={data.count} onPageChange={(p) => setFilters({ page: p })} />
      )}
    </div>
  )
}
