import { Users, UserCheck, UserX, UserCog, Wallet, IndianRupee, Receipt, CheckCircle2, Clock } from 'lucide-react'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useAdminDashboard } from '@/hooks/useDashboard'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { DashboardCard } from '@/features/dashboard/DashboardCard'
import { StatGridSkeleton } from '@/components/LoadingSkeletons'
import { ErrorState } from '@/components/StateViews'
import { formatINR, formatPeriod } from '@/lib/format'

export default function AdminDashboardPage() {
  const { period, setPeriod } = usePeriodSelector()
  const { data: stats, isLoading, isError, refetch } = useAdminDashboard(period?.month, period?.year)

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
            label={formatPeriod(period.month, period.year)}
            value={formatINR(stats.period_donation_amount)}
            description="Donations this month"
            icon={IndianRupee}
            tone="gold"
            to="/admin/donations"
          />
          <DashboardCard
            label="Donations This Month"
            value={stats.period_donation_count}
            description="Number of donations"
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
            label="Pending Follow-ups"
            value={stats.pending_followups}
            description="Requires attention"
            icon={Clock}
            tone="warning"
            to="/admin/followups"
          />
        </div>
      )}
    </div>
  )
}
