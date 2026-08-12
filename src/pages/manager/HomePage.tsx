import { Link } from 'react-router-dom'
import { Users, UserCheck, IndianRupee, HeartHandshake, CheckCircle2, Clock, ClipboardList } from 'lucide-react'
import { useProfile } from '@/contexts/ProfileContext'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useManagerDashboard } from '@/hooks/useDashboard'
import { PeriodSelector } from '@/components/PeriodSelector'
import { DashboardCard } from '@/features/dashboard/DashboardCard'
import { StatGridSkeleton } from '@/components/LoadingSkeletons'
import { ErrorState } from '@/components/StateViews'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RecordDonationDialog } from '@/features/donations/RecordDonationDialog'
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

  const donationBreakdown = stats
    ? [
        { label: 'Zakat', amount: stats.zakat_amount },
        { label: 'Sadaqah/Sadka', amount: stats.sadaqah_amount },
        { label: 'Fitra', amount: stats.fitra_amount },
        { label: 'General & Other', amount: stats.general_or_other_amount },
      ]
    : []

  return (
    <div className="space-y-5 p-4">
      <div className="overflow-hidden rounded-2xl bg-primary px-5 py-6 text-primary-foreground shadow-sm">
        <p className="text-sm text-primary-foreground/80">Assalamu alaikum, {firstName || profile?.full_name}</p>
        <h1 className="font-display mt-1 text-xl font-semibold">Al Ansar Foundation</h1>
        <p className="text-sm text-primary-foreground/80">Member &amp; Donation Management</p>
      </div>

      <div className="flex gap-2">
        <RecordDonationDialog variant="outline" size="sm" className="flex-1" label="Donation" />
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link to="/manager/followups">
            <ClipboardList className="size-4" /> Follow-up
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link to="/manager/members">
            <Users className="size-4" /> Members
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Your overview</h2>
        {period && <PeriodSelector period={period} onChange={setPeriod} />}
      </div>

      {isLoading && <StatGridSkeleton />}
      {isError && <ErrorState message="Unable to load your dashboard. Please try again." onRetry={refetch} />}

      {stats && period && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <DashboardCard
              label="Total Members"
              value={stats.total_members}
              description="Assigned to you"
              icon={Users}
              tone="primary"
              to="/manager/members"
            />
            <DashboardCard
              label="Active Members"
              value={stats.active_members}
              description="Currently active"
              icon={UserCheck}
              tone="success"
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
              label="Donors This Month"
              value={stats.members_with_donation}
              description="Members who donated"
              icon={HeartHandshake}
              tone="info"
              to="/manager/donations"
            />
            <DashboardCard
              label="Completed Follow-ups"
              value={stats.completed_followups}
              description="This month"
              icon={CheckCircle2}
              tone="success"
              to="/manager/followups"
            />
            <DashboardCard
              label="Pending Follow-ups"
              value={stats.pending_followups}
              description="Requires attention"
              icon={Clock}
              tone="warning"
              to="/manager/followups"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Donation Breakdown</CardTitle>
              <CardDescription>{formatPeriod(period.month, period.year)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {donationBreakdown.map((row) => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium tabular-nums">{formatINR(row.amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
