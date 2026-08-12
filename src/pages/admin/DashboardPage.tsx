import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserCheck, UserX, UserCog, Wallet, IndianRupee, Receipt, CheckCircle2, Clock } from 'lucide-react'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useAdminDashboard, useAttentionMembers, useManagerWiseReport, useMonthWiseReport } from '@/hooks/useDashboard'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import { useManagers } from '@/hooks/useManagers'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { DashboardCard } from '@/features/dashboard/DashboardCard'
import { CardListSkeleton, StatGridSkeleton, TableSkeleton } from '@/components/LoadingSkeletons'
import { ErrorState, EmptyState } from '@/components/StateViews'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MonthlyBarChart } from '@/features/reports/MonthlyBarChart'
import { MemberStatusBadge, NoRecentDonationBadge, PendingFollowupBadge } from '@/components/StatusBadge'
import { findActionTypeOption } from '@/features/auditLogs/ActionTypeOptions'
import { formatDateTime, formatINR, formatPeriod } from '@/lib/format'
import { DONATION_TYPES } from '@/schemas/donation.schema'
import type { DonationType } from '@/types'

const DONATION_TYPE_LABELS: Record<string, string> = {
  ZAKAT: 'Zakat',
  SADAQAH: 'Sadaqah/Sadka',
  FITRA: 'Fitra',
  GENERAL: 'General Donation',
  OTHER: 'Other',
}

const ACTION_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  members_created: 'secondary',
  members_updated: 'outline',
  donations_created: 'secondary',
  donations_updated: 'destructive',
  monthly_followups_created: 'secondary',
  managers_created: 'secondary',
  managers_updated: 'outline',
}

const ATTENTION_PREVIEW_LIMIT = 8

export default function AdminDashboardPage() {
  const { period, setPeriod } = usePeriodSelector()
  const [managerId, setManagerId] = useState('ALL')
  const [donationType, setDonationType] = useState<DonationType | 'ALL'>('ALL')

  const scopedManagerId = managerId === 'ALL' ? undefined : managerId
  const scopedDonationType = donationType === 'ALL' ? undefined : donationType

  const { data: stats, isLoading, isError, refetch } = useAdminDashboard(period?.month, period?.year)
  const { data: managers = [] } = useManagers()

  const {
    data: monthRows,
    isLoading: isTrendLoading,
    isError: isTrendError,
    refetch: refetchTrend,
  } = useMonthWiseReport(period?.year, scopedDonationType)

  const {
    data: managerRows,
    isLoading: isManagerLoading,
    isError: isManagerError,
    refetch: refetchManager,
  } = useManagerWiseReport(period?.month, period?.year, scopedDonationType)

  const {
    data: attentionMembers,
    isLoading: isAttentionLoading,
    isError: isAttentionError,
    refetch: refetchAttention,
  } = useAttentionMembers(period?.month, period?.year, scopedManagerId)

  const {
    data: recentActivity,
    isLoading: isActivityLoading,
    isError: isActivityError,
    refetch: refetchActivity,
  } = useAuditLogs({ page: 1, pageSize: 5 })

  const totalCollection = monthRows?.reduce((sum, r) => sum + r.donation_amount, 0) ?? 0
  const attentionPreview = attentionMembers?.slice(0, ATTENTION_PREVIEW_LIMIT) ?? []

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
        <Select value={donationType} onValueChange={(v) => setDonationType(v as DonationType | 'ALL')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All donation types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All donation types</SelectItem>
            {DONATION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {DONATION_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Donation Trend</CardTitle>
          <CardDescription>
            {period ? `Total collected in ${period.year}: ${formatINR(totalCollection)}` : undefined}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isTrendLoading && <TableSkeleton rows={1} cols={12} />}
          {isTrendError && <ErrorState message="Unable to load the donation trend." onRetry={refetchTrend} />}
          {monthRows && <MonthlyBarChart rows={monthRows} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manager-wise Summary</CardTitle>
          <CardDescription>{period && formatPeriod(period.month, period.year)}</CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/reports">View full report</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {isManagerLoading && <TableSkeleton cols={5} />}
          {isManagerError && <ErrorState message="Unable to load the manager summary." onRetry={refetchManager} />}
          {managerRows && managerRows.length === 0 && <EmptyState title="No managers found." />}
          {managerRows && managerRows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Manager</th>
                    <th className="p-3 font-medium">Members</th>
                    <th className="p-3 font-medium">Donations</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {managerRows.map((row) => (
                    <tr key={row.manager_id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{row.manager_name}</td>
                      <td className="p-3 tabular-nums">{row.assigned_members}</td>
                      <td className="p-3 tabular-nums">{row.donation_count}</td>
                      <td className="p-3 tabular-nums">{formatINR(row.donation_amount)}</td>
                      <td className="p-3 tabular-nums">{row.pending_followups}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members Requiring Attention</CardTitle>
          <CardDescription>Pending follow-up, inactive, or no donation in the last 3 months</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isAttentionLoading && <CardListSkeleton count={4} />}
          {isAttentionError && <ErrorState message="Unable to load this list." onRetry={refetchAttention} />}
          {attentionMembers && attentionMembers.length === 0 && (
            <EmptyState title="No members currently need attention." />
          )}
          {attentionPreview.map((m) => (
            <Link
              key={m.id}
              to={`/admin/members/${m.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:bg-accent/40"
            >
              <div className="min-w-0">
                <p className="font-medium">{m.member_name}</p>
                <p className="text-xs text-muted-foreground">{[m.father_name, m.manager_name].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {m.is_pending_followup && <PendingFollowupBadge />}
                {m.is_inactive && <MemberStatusBadge status={m.status} />}
                {m.no_recent_donation && <NoRecentDonationBadge />}
              </div>
            </Link>
          ))}
          {attentionMembers && attentionMembers.length > ATTENTION_PREVIEW_LIMIT && (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              Showing {ATTENTION_PREVIEW_LIMIT} of {attentionMembers.length}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/audit-logs">View all</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-2">
          {isActivityLoading && <CardListSkeleton count={5} />}
          {isActivityError && <ErrorState message="Unable to load recent activity." onRetry={refetchActivity} />}
          {recentActivity && recentActivity.rows.length === 0 && <EmptyState title="No activity recorded yet." />}
          {recentActivity?.rows.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant={ACTION_BADGE_VARIANT[log.action] ?? 'outline'}>
                  {findActionTypeOption(log.action)?.label ?? log.action}
                </Badge>
                <p className="truncate text-sm">{log.memberName ?? log.actor?.full_name ?? 'System'}</p>
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(log.created_at)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
