import { Users, IndianRupee, UserCheck, CheckCircle2, Clock, Receipt } from 'lucide-react'
import { useProfile } from '@/contexts/ProfileContext'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useManagerDashboard } from '@/hooks/useDashboard'
import { PeriodSelector } from '@/components/PeriodSelector'
import { DashboardCard } from '@/features/dashboard/DashboardCard'
import { StatGridSkeleton } from '@/components/LoadingSkeletons'
import { ErrorState } from '@/components/StateViews'
import { formatINR, formatPeriod } from '@/lib/format'

export default function ManagerHomePage() {
  const { profile } = useProfile()
  const { period, setPeriod } = usePeriodSelector()
  const { data: stats, isLoading, isError, refetch } = useManagerDashboard(
    profile?.manager_id ?? undefined,
    period?.month,
    period?.year,
  )

  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  return (
    <div className="space-y-5 p-4">
      <div className="overflow-hidden rounded-2xl bg-primary px-5 py-6 text-primary-foreground shadow-sm">
        <p className="text-sm text-primary-foreground/80">Assalamu alaikum, {firstName || profile?.full_name}</p>
        <h1 className="font-display mt-1 text-xl font-semibold">Al Ansar Foundation</h1>
        <p className="text-sm text-primary-foreground/80">Member &amp; Donation Management</p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Your overview</h2>
        {period && <PeriodSelector period={period} onChange={setPeriod} />}
      </div>

      {isLoading && <StatGridSkeleton />}
      {isError && <ErrorState message="Unable to load your dashboard. Please try again." onRetry={refetch} />}

      {stats && period && (
        <div className="grid grid-cols-2 gap-3">
          <DashboardCard
            label="My Members"
            value={stats.active_members}
            description="Members assigned to you"
            icon={Users}
            tone="primary"
            to="/manager/members"
          />
          <DashboardCard
            label="Donations This Month"
            value={formatINR(stats.donation_amount)}
            description={formatPeriod(period.month, period.year)}
            icon={IndianRupee}
            tone="gold"
            to="/manager/donations"
          />
          <DashboardCard
            label="Members With Donation"
            value={stats.members_with_donation}
            description="Donated this month"
            icon={UserCheck}
            tone="success"
          />
          <DashboardCard
            label="Completed Follow-ups"
            value={stats.completed_followups}
            description="Members contacted this month"
            icon={CheckCircle2}
            tone="info"
          />
          <DashboardCard
            label="Pending Follow-ups"
            value={stats.pending_followups}
            description="Requires attention"
            icon={Clock}
            tone="warning"
            to="/manager/pending"
          />
          <DashboardCard
            label="Number of Donations"
            value={stats.donation_count}
            description="Donations recorded"
            icon={Receipt}
            tone="neutral"
            to="/manager/donations"
          />
        </div>
      )}
    </div>
  )
}
