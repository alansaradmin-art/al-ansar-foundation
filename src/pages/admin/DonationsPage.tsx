import { useState } from 'react'
import { Download } from 'lucide-react'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useAdminDonations } from '@/hooks/useDonations'
import { useManagers } from '@/hooks/useManagers'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { TableSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SoftDeleteDonationDialog } from '@/features/donations/SoftDeleteDonationDialog'
import { AnonymousDonationDialog } from '@/features/donations/AnonymousDonationDialog'
import { AnonymousDonationBadge } from '@/components/StatusBadge'
import { formatDate, formatINR } from '@/lib/format'
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
  const [managerId, setManagerId] = useState('ALL')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'ALL'>('ALL')
  const [donationType, setDonationType] = useState<DonationType | 'ALL'>('ALL')
  const [page, setPage] = useState(1)

  const { data: managers = [] } = useManagers()
  const { data, isLoading, isError, refetch } = useAdminDonations({
    month: period?.month,
    year: period?.year,
    managerId: managerId === 'ALL' ? undefined : managerId,
    paymentMethod: paymentMethod === 'ALL' ? undefined : paymentMethod,
    donationType: donationType === 'ALL' ? undefined : donationType,
    page,
    pageSize: 25,
  })

  function handleExport() {
    if (!data) return
    const csv = toCsv<DonationWithRelations>(data.rows, [
      { key: 'donation_date', label: 'Donation Date', value: (r) => r.donation_date },
      { key: 'member', label: 'Member', value: (r) => r.member?.member_name ?? 'Anonymous' },
      { key: 'father_name', label: "Father's Name", value: (r) => r.member?.father_name ?? '' },
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
        <Select value={managerId} onValueChange={setManagerId}>
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
        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod | 'ALL')}>
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
        <Select value={donationType} onValueChange={(v) => setDonationType(v as DonationType | 'ALL')}>
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
        <AnonymousDonationDialog />
      </div>

      {isLoading && <TableSkeleton cols={7} />}
      {isError && <ErrorState message="Unable to load donations. Please try again." onRetry={refetch} />}
      {data && data.rows.length === 0 && <EmptyState title="No donations recorded for this month." />}

      {data && data.rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Member</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Amount</th>
                <th className="p-3 font-medium">Method</th>
                <th className="p-3 font-medium">Reference</th>
                <th className="p-3 font-medium">Recorded By</th>
                <th className="p-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((donation) => (
                <tr key={donation.id} className="border-b last:border-0">
                  <td className="p-3 whitespace-nowrap">{formatDate(donation.donation_date)}</td>
                  <td className="p-3">
                    {donation.member ? (
                      <>
                        <p>{donation.member.member_name}</p>
                        {donation.member.father_name && (
                          <p className="text-xs text-muted-foreground">{donation.member.father_name}</p>
                        )}
                      </>
                    ) : (
                      <AnonymousDonationBadge />
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary">{DONATION_TYPE_LABELS[donation.donation_type]}</Badge>
                  </td>
                  <td className="p-3 font-medium tabular-nums">{formatINR(donation.amount_inr)}</td>
                  <td className="p-3">
                    <Badge variant="outline">{PAYMENT_LABELS[donation.payment_method]}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{donation.transaction_reference || '—'}</td>
                  <td className="p-3 text-muted-foreground">{donation.recorder?.full_name ?? '—'}</td>
                  <td className="p-3">
                    <SoftDeleteDonationDialog donationId={donation.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.count > 25 && (
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(data.count / 25)}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(data.count / 25)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
