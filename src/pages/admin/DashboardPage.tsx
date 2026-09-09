import { Link } from 'react-router-dom'
import {
  Users,
  UserCheck,
  UserX,
  UserCog,
  Wallet,
  IndianRupee,
  Receipt,
  CheckCircle2,
  ClipboardX,
  Hourglass,
  HandCoins,
  Sparkles,
  Wheat,
  CircleDollarSign,
  Send,
  ShieldCheck,
  Ban,
  PiggyBank,
} from 'lucide-react'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import {
  useAdminDashboard,
  useMemberGrowthTrend,
  useMonthlyDonationReport,
  useExpenseDashboardStats,
  useExpenseCategoryBreakdown,
  useExpenseFundBreakdown,
  useExpenseMonthlyTrend,
} from '@/hooks/useDashboard'
import { useOverdueFollowups, useAdminOpenFollowups } from '@/hooks/useFollowups'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { DashboardCard } from '@/features/dashboard/DashboardCard'
import { NeedsAttentionSection } from '@/features/dashboard/NeedsAttentionSection'
import { CardListSkeleton, StatGridSkeleton, TableSkeleton } from '@/components/LoadingSkeletons'
import { ErrorState, EmptyState } from '@/components/StateViews'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatINR, formatPeriod, monthName } from '@/lib/format'
import type { MemberGrowthRow } from '@/services/dashboard'

const TOP_DONORS_LIMIT = 5

function MemberGrowthChart({ rows }: { rows: MemberGrowthRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.new_members))

  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-2" role="img" aria-label="New members per month">
      {rows.map((row) => (
        <div key={row.month} className="flex w-14 shrink-0 flex-col items-center gap-1.5">
          <span className="text-[11px] tabular-nums text-muted-foreground">{row.new_members > 0 ? row.new_members : ''}</span>
          <div className="flex h-32 w-full items-end rounded-md bg-muted/40">
            <div
              className="w-full rounded-md bg-primary"
              style={{ height: `${(row.new_members / max) * 100}%`, minHeight: row.new_members > 0 ? 4 : 0 }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground">{monthName(row.month).slice(0, 3)}</span>
        </div>
      ))}
    </div>
  )
}

function ExpenseTrendChart({ rows }: { rows: { month: number; amount: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.amount))

  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-2" role="img" aria-label="Paid expenses per month">
      {rows.map((row) => (
        <div key={row.month} className="flex w-14 shrink-0 flex-col items-center gap-1.5">
          <span className="text-[11px] tabular-nums text-muted-foreground">{row.amount > 0 ? formatINR(row.amount) : ''}</span>
          <div className="flex h-32 w-full items-end rounded-md bg-muted/40">
            <div
              className="w-full rounded-md bg-destructive/70"
              style={{ height: `${(row.amount / max) * 100}%`, minHeight: row.amount > 0 ? 4 : 0 }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground">{monthName(row.month).slice(0, 3)}</span>
        </div>
      ))}
    </div>
  )
}

/** A ranked list with a proportional bar per row — shared shape for both
 * the category and fund breakdowns below, since they're the same kind of
 * "which slice is biggest" question against a different grouping. */
function ExpenseBreakdownList({ rows }: { rows: { label: string; amount: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.amount))
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate text-muted-foreground">{row.label}</span>
            <span className="shrink-0 font-medium tabular-nums">{formatINR(row.amount)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-destructive/60" style={{ width: `${(row.amount / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboardPage() {
  const { period, setPeriod } = usePeriodSelector()

  const { data: stats, isLoading: isStatsLoading, isError, refetch } = useAdminDashboard(period?.month, period?.year)

  // Dashboard-wide (undefined managerId) counterparts of the exact same
  // queries the Follow-ups page's Overdue/In Progress tabs use — sharing
  // the hooks (not stats.pending_followups, a looser is_pending_followup()
  // count that also includes open attempts) keeps these numbers from ever
  // disagreeing with what the tabs themselves show.
  const {
    data: overdueRows,
    isLoading: isOverdueLoading,
  } = useOverdueFollowups(undefined, period?.month, period?.year)
  const {
    data: openRows,
    isLoading: isOpenLoading,
  } = useAdminOpenFollowups(undefined, period?.month, period?.year)
  const isLoading = isStatsLoading || isOverdueLoading || isOpenLoading

  const {
    data: growthRows,
    isLoading: isGrowthLoading,
    isError: isGrowthError,
    refetch: refetchGrowth,
  } = useMemberGrowthTrend(period?.year)

  const {
    data: donationReport,
    isLoading: isDonationReportLoading,
    isError: isDonationReportError,
    refetch: refetchDonationReport,
  } = useMonthlyDonationReport(period?.month, period?.year)

  const {
    data: expenseStats,
    isLoading: isExpenseStatsLoading,
    isError: isExpenseStatsError,
    refetch: refetchExpenseStats,
  } = useExpenseDashboardStats(period?.month, period?.year)
  const { data: categoryBreakdown = [] } = useExpenseCategoryBreakdown(period?.month, period?.year)
  const { data: fundBreakdown = [] } = useExpenseFundBreakdown(period?.month, period?.year)
  const { data: expenseTrend = [] } = useExpenseMonthlyTrend(period?.year)

  const topDonors = [...(donationReport?.members ?? [])].sort((a, b) => b.total - a.total).slice(0, TOP_DONORS_LIMIT)
  const donorCount = donationReport?.members.length ?? 0
  const donatedRate = stats && stats.active_members > 0 ? (donorCount / stats.active_members) * 100 : 0
  const followupRate = stats && stats.active_members > 0 ? (stats.completed_followups / stats.active_members) * 100 : 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Foundation-wide overview across every manager"
        actions={period && <PeriodSelector period={period} onChange={setPeriod} />}
      />

      {isLoading && <StatGridSkeleton count={9} />}
      {isError && <ErrorState message="Unable to load the dashboard. Please try again." onRetry={refetch} />}

      {stats && period && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <DashboardCard
            label="Total Members"
            value={stats.total_members}
            description="Across all managers"
            icon={Users}
            tone="primary"
            to="/admin/members"
          />
          <DashboardCard
            label="Active Members"
            value={stats.active_members}
            description="Currently active"
            icon={UserCheck}
            tone="success"
            to="/admin/members"
          />
          <DashboardCard
            label="Inactive Members"
            value={stats.inactive_members}
            description="Not currently active"
            icon={UserX}
            tone="neutral"
            to="/admin/members"
          />
          <DashboardCard
            label="Total Managers"
            value={stats.total_managers}
            description="Active managers"
            icon={UserCog}
            tone="info"
            to="/admin/managers"
          />
          <DashboardCard
            label="Total Donations"
            value={formatINR(stats.total_donation_amount)}
            description="All-time"
            icon={Wallet}
            tone="gold"
            to="/admin/donations"
          />
          <DashboardCard
            label="Total Donation Count"
            value={stats.total_donations}
            description="All-time"
            icon={Receipt}
            tone="neutral"
            to="/admin/donations"
          />
          <DashboardCard
            label="Completed Follow-ups"
            value={stats.completed_followups}
            description="This month"
            icon={CheckCircle2}
            tone="success"
            to="/admin/followups"
          />
          <DashboardCard
            label="Overdue Follow-ups"
            value={overdueRows?.length ?? 0}
            description="Requires attention"
            icon={ClipboardX}
            tone="warning"
            to="/admin/followups?tab=overdue"
          />
          <DashboardCard
            label="In Progress Follow-ups"
            value={openRows?.length ?? 0}
            description="Started, ongoing, or callback required"
            icon={Hourglass}
            tone="info"
            to="/admin/followups?tab=inProgress"
          />
        </div>
      )}

      {/* Moved here from Reports → Donation Report (now removed) — reuses
       * the exact same donationReport query already fetched above for Top
       * Donors/Engagement Snapshot, so this is the identical database
       * logic and summary figures, just also rendered as KPI cards.
       * Same grid breakpoints the original Donation Report used
       * (2 cols mobile, 3 cols small tablet, 6 cols desktop). */}
      {isDonationReportLoading && <StatGridSkeleton count={6} />}
      {isDonationReportError && (
        <ErrorState message="Unable to load the donation breakdown." onRetry={refetchDonationReport} />
      )}
      {donationReport && period && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Donation Breakdown — {formatPeriod(period.month, period.year)}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <DashboardCard
              label="Total Donations"
              value={donationReport.summary.totalCount}
              icon={Receipt}
              tone="neutral"
              to="/admin/donations"
            />
            <DashboardCard
              label="Total Amount"
              value={formatINR(donationReport.summary.totalAmount)}
              icon={IndianRupee}
              tone="primary"
              to="/admin/donations"
            />
            <DashboardCard label="Zakat" value={formatINR(donationReport.summary.zakat)} icon={HandCoins} tone="success" />
            <DashboardCard label="Sadaqah/Sadka" value={formatINR(donationReport.summary.sadaqah)} icon={Sparkles} tone="gold" />
            <DashboardCard label="Fitra" value={formatINR(donationReport.summary.fitra)} icon={Wheat} tone="info" />
            <DashboardCard
              label="General/Other"
              value={formatINR(donationReport.summary.generalOrOther)}
              icon={CircleDollarSign}
              tone="neutral"
            />
          </div>
        </div>
      )}

      {/* Expense Overview (Phase 4) — same section shape as Donation
       * Breakdown above: a KPI row scoped to the selected period, plus
       * category/fund/trend charts below. Every number here reflects only
       * PAID expenses (never Draft/Submitted commitments) except the two
       * live queue counts, which intentionally aren't period-scoped — see
       * expense_dashboard_stats() in supabase/migrations/0043. */}
      {isExpenseStatsLoading && <StatGridSkeleton count={6} />}
      {isExpenseStatsError && <ErrorState message="Unable to load the expense overview." onRetry={refetchExpenseStats} />}
      {expenseStats && period && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Expense Overview — {formatPeriod(period.month, period.year)}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <DashboardCard
              label="Total Expenses"
              value={formatINR(expenseStats.total_expenses_amount)}
              description="All-time, paid"
              icon={Wallet}
              tone="neutral"
              to="/admin/expenses"
            />
            <DashboardCard
              label="This Month's Expenses"
              value={formatINR(expenseStats.period_expenses_amount)}
              icon={IndianRupee}
              tone="primary"
              to="/admin/expenses"
            />
            <DashboardCard
              label="Pending Approval"
              value={expenseStats.pending_approval_count}
              description="Awaiting committee sign-off"
              icon={Send}
              tone="warning"
              to="/admin/expenses?status=SUBMITTED"
            />
            <DashboardCard
              label="Approved"
              value={expenseStats.approved_count}
              description="Awaiting payment"
              icon={ShieldCheck}
              tone="info"
              to="/admin/expenses?status=APPROVED"
            />
            <DashboardCard
              label="Rejected / Cancelled"
              value={expenseStats.period_rejected_count + expenseStats.period_cancelled_count}
              description="This month"
              icon={Ban}
              tone="neutral"
            />
            <DashboardCard
              label="Net Available Balance"
              value={formatINR(expenseStats.available_balance)}
              description="Donations − paid expenses, all funds"
              icon={PiggyBank}
              tone="success"
            />
          </div>
        </div>
      )}

      {(categoryBreakdown.length > 0 || fundBreakdown.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {categoryBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>{period && formatPeriod(period.month, period.year)}</CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseBreakdownList rows={categoryBreakdown.map((r) => ({ label: r.category_name, amount: r.amount }))} />
              </CardContent>
            </Card>
          )}
          {fundBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Fund</CardTitle>
                <CardDescription>{period && formatPeriod(period.month, period.year)}</CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseBreakdownList rows={fundBreakdown.map((r) => ({ label: r.fund_name, amount: r.amount }))} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Expense Trend</CardTitle>
          <CardDescription>{period && `Paid expenses in ${period.year}`}</CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseTrendChart rows={expenseTrend} />
        </CardContent>
      </Card>

      <NeedsAttentionSection period={period} />

      <Card>
        <CardHeader>
          <CardTitle>Member Growth Trend</CardTitle>
          <CardDescription>{period && `New members added in ${period.year}`}</CardDescription>
        </CardHeader>
        <CardContent>
          {isGrowthLoading && <TableSkeleton rows={1} cols={12} />}
          {isGrowthError && <ErrorState message="Unable to load member growth." onRetry={refetchGrowth} />}
          {growthRows && <MemberGrowthChart rows={growthRows} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Donors This Period</CardTitle>
          <CardDescription>{period && formatPeriod(period.month, period.year)}</CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/reports">View full report</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-2">
          {isDonationReportLoading && <CardListSkeleton count={TOP_DONORS_LIMIT} />}
          {isDonationReportError && (
            <ErrorState message="Unable to load top donors." onRetry={refetchDonationReport} />
          )}
          {donationReport && topDonors.length === 0 && (
            <EmptyState title="No donations recorded for this month." />
          )}
          {topDonors.map((m, i) => (
            <Link
              key={m.memberId}
              to={`/admin/members/${m.memberId}`}
              className="flex items-center justify-between gap-2 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:bg-accent/40"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold/25 text-xs font-semibold text-gold-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.memberName}</p>
                  {m.memberFatherName && <p className="truncate text-xs text-muted-foreground">{m.memberFatherName}</p>}
                </div>
              </div>
              <span className="shrink-0 font-display font-semibold tabular-nums">{formatINR(m.total)}</span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engagement Snapshot</CardTitle>
          <CardDescription>{period && `${formatPeriod(period.month, period.year)} — share of active members`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(isLoading || isDonationReportLoading) && <CardListSkeleton count={2} />}
          {(isError || isDonationReportError) && (
            <ErrorState message="Unable to load engagement figures." onRetry={refetch} />
          )}
          {stats && donationReport && (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Donated this month</span>
                  <span className="font-medium tabular-nums">{donatedRate.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, donatedRate)}%` }} />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Follow-up completed this month</span>
                  <span className="font-medium tabular-nums">{followupRate.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, followupRate)}%` }} />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
