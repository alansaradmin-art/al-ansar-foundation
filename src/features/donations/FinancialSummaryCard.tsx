import { IndianRupee, CalendarRange, CalendarClock, Repeat, History, Hash } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardCard } from '@/features/dashboard/DashboardCard'
import { computeFinancialSummary, frequencyLabel } from '@/lib/memberFinancials'
import { formatDate, formatINR } from '@/lib/format'
import type { Donation } from '@/types'

/** Every figure is derived from the member's already-loaded donation
 * history (see computeFinancialSummary) — no separate fetch. Deliberately
 * descriptive only: "frequency" is a plain classification, never a target
 * or commitment. */
export function FinancialSummaryCard({ donations }: { donations: Donation[] }) {
  const summary = computeFinancialSummary(donations)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Donation Summary</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <DashboardCard label="Total Contribution" value={formatINR(summary.totalContribution)} icon={IndianRupee} tone="gold" />
        <DashboardCard
          label="This Year"
          value={formatINR(summary.currentYearContribution)}
          icon={CalendarRange}
          tone="primary"
        />
        <DashboardCard
          label="This Month"
          value={formatINR(summary.currentMonthContribution)}
          icon={CalendarClock}
          tone="info"
        />
        <DashboardCard
          label="Donation Frequency"
          value={frequencyLabel(summary.activeMonthsLast12)}
          description={`${summary.activeMonthsLast12} of the last 12 months`}
          icon={Repeat}
          tone="success"
        />
        <DashboardCard
          label="Last Donation"
          value={summary.lastDonationDate ? formatDate(summary.lastDonationDate) : 'Never'}
          icon={History}
          tone="neutral"
        />
        <DashboardCard label="Total Donations" value={summary.donationCount} icon={Hash} tone="neutral" />
      </CardContent>
    </Card>
  )
}
