import { useState } from 'react'
import { Download } from 'lucide-react'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useManagerWiseReport, useMonthWiseReport, useMonthlyDonationReport } from '@/hooks/useDashboard'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { TableSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState } from '@/components/StateViews'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MonthlyBarChart } from '@/features/reports/MonthlyBarChart'
import { MonthlyDonationReport } from '@/features/reports/MonthlyDonationReport'
import { formatINR, formatMobileNumber, formatPeriod, monthName } from '@/lib/format'
import { toCsv, downloadCsv } from '@/lib/csv'
import type { ManagerWiseReportRow, MonthWiseReportRow, DonationReportRow } from '@/services/dashboard'

const DONATION_TYPE_LABELS: Record<string, string> = {
  ZAKAT: 'Zakat',
  SADAQAH: 'Sadaqah/Sadka',
  FITRA: 'Fitra',
  GENERAL: 'General Donation',
  OTHER: 'Other',
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  ONLINE: 'Online',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
}

export default function ReportsPage() {
  const { period, setPeriod } = usePeriodSelector()
  const [year, setYear] = useState(new Date().getFullYear())

  const { data: managerRows, isLoading: isManagerLoading } = useManagerWiseReport(period?.month, period?.year)
  const { data: monthRows, isLoading: isMonthLoading } = useMonthWiseReport(year)
  const { data: donationReport, isLoading: isDonationReportLoading } = useMonthlyDonationReport(period?.month, period?.year)

  function exportManagerReport() {
    if (!managerRows || !period) return
    const csv = toCsv<ManagerWiseReportRow>(managerRows, [
      { key: 'manager', label: 'Manager', value: (r) => r.manager_name },
      { key: 'assigned', label: 'Assigned Members', value: (r) => r.assigned_members },
      { key: 'donors', label: 'Members With Donation', value: (r) => r.members_with_donation },
      { key: 'count', label: 'Donation Count', value: (r) => r.donation_count },
      { key: 'amount', label: 'Donation Amount (INR)', value: (r) => r.donation_amount },
      { key: 'completed', label: 'Completed Follow-ups', value: (r) => r.completed_followups },
      { key: 'pending', label: 'Pending Follow-ups', value: (r) => r.pending_followups },
    ])
    downloadCsv(`manager-wise-report-${period.year}-${period.month}.csv`, csv)
  }

  function exportMonthReport() {
    if (!monthRows) return
    const csv = toCsv<MonthWiseReportRow>(monthRows, [
      { key: 'month', label: 'Month', value: (r) => monthName(r.month) },
      { key: 'year', label: 'Year', value: (r) => r.year },
      { key: 'count', label: 'Donation Count', value: (r) => r.donation_count },
      { key: 'amount', label: 'Donation Amount (INR)', value: (r) => r.donation_amount },
      { key: 'completed', label: 'Completed Follow-ups', value: (r) => r.completed_followups },
      { key: 'pending', label: 'Pending Follow-ups', value: (r) => r.pending_followups },
    ])
    downloadCsv(`month-wise-report-${year}.csv`, csv)
  }

  function exportDonationReport() {
    if (!donationReport || !period) return
    type FlatRow = DonationReportRow & { memberLabel: string; fatherNameLabel: string; mobileLabel: string }
    const flatRows: FlatRow[] = [
      ...donationReport.members.flatMap((m) =>
        m.donations.map((d) => ({
          ...d,
          memberLabel: m.memberName,
          fatherNameLabel: m.memberFatherName ?? '',
          mobileLabel: formatMobileNumber(m.memberMobileNumber),
        })),
      ),
      ...donationReport.anonymous.donations.map((d) => ({ ...d, memberLabel: 'Anonymous', fatherNameLabel: '', mobileLabel: '' })),
    ]
    const csv = toCsv<FlatRow>(flatRows, [
      { key: 'member', label: 'Member Name', value: (r) => r.memberLabel },
      { key: 'father_name', label: "Father's Name", value: (r) => r.fatherNameLabel },
      { key: 'mobile', label: 'Mobile Number', value: (r) => r.mobileLabel },
      { key: 'type', label: 'Donation Type', value: (r) => DONATION_TYPE_LABELS[r.donation_type] },
      { key: 'amount', label: 'Amount (INR)', value: (r) => r.amount_inr },
      { key: 'date', label: 'Donation Date', value: (r) => r.donation_date },
      { key: 'method', label: 'Payment Method', value: (r) => PAYMENT_LABELS[r.payment_method] },
      { key: 'ref', label: 'Transaction Reference', value: (r) => r.transaction_reference ?? '' },
    ])
    downloadCsv(`monthly-donation-report-${period.year}-${period.month}.csv`, csv)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" description="Manager performance and month-over-month donation trends" />

      <Tabs defaultValue="manager">
        <TabsList>
          <TabsTrigger value="manager">Manager-wise</TabsTrigger>
          <TabsTrigger value="month">Month-wise</TabsTrigger>
          <TabsTrigger value="donations">Donation Report</TabsTrigger>
        </TabsList>

        <TabsContent value="manager" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {period && <PeriodSelector period={period} onChange={setPeriod} />}
            <Button variant="outline" onClick={exportManagerReport} disabled={!managerRows?.length}>
              <Download className="size-4" /> Export CSV
            </Button>
          </div>

          {isManagerLoading && <TableSkeleton cols={7} />}
          {managerRows && managerRows.length === 0 && <EmptyState title="No managers found." />}

          {managerRows && managerRows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Manager</th>
                    <th className="p-3 font-medium">Assigned</th>
                    <th className="p-3 font-medium">Donors</th>
                    <th className="p-3 font-medium">Donations</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Completed</th>
                    <th className="p-3 font-medium">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {managerRows.map((row) => (
                    <tr key={row.manager_id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{row.manager_name}</td>
                      <td className="p-3 tabular-nums">{row.assigned_members}</td>
                      <td className="p-3 tabular-nums">{row.members_with_donation}</td>
                      <td className="p-3 tabular-nums">{row.donation_count}</td>
                      <td className="p-3 tabular-nums">{formatINR(row.donation_amount)}</td>
                      <td className="p-3 tabular-nums">{row.completed_followups}</td>
                      <td className="p-3 tabular-nums">{row.pending_followups}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="month" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-28"
            />
            <Button variant="outline" onClick={exportMonthReport} disabled={!monthRows?.length}>
              <Download className="size-4" /> Export CSV
            </Button>
          </div>

          {isMonthLoading && <TableSkeleton cols={5} />}

          {monthRows && monthRows.length > 0 && (
            <>
              <MonthlyBarChart rows={monthRows} />
              <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium">Month</th>
                      <th className="p-3 font-medium">Donations</th>
                      <th className="p-3 font-medium">Amount</th>
                      <th className="p-3 font-medium">Completed</th>
                      <th className="p-3 font-medium">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthRows.map((row) => (
                      <tr key={row.month} className="border-b last:border-0">
                        <td className="p-3 font-medium">{formatPeriod(row.month, row.year)}</td>
                        <td className="p-3 tabular-nums">{row.donation_count}</td>
                        <td className="p-3 tabular-nums">{formatINR(row.donation_amount)}</td>
                        <td className="p-3 tabular-nums">{row.completed_followups}</td>
                        <td className="p-3 tabular-nums">{row.pending_followups}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="donations" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {period && <PeriodSelector period={period} onChange={setPeriod} />}
            <Button variant="outline" onClick={exportDonationReport} disabled={!donationReport?.summary.totalCount}>
              <Download className="size-4" /> Export CSV
            </Button>
          </div>

          {isDonationReportLoading && <TableSkeleton cols={3} />}
          {donationReport && <MonthlyDonationReport data={donationReport} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
