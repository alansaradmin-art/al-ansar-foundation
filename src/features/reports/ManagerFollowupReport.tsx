import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClipboardList, Hourglass, CheckCircle2, Users } from 'lucide-react'
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, format } from 'date-fns'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useManagerFollowupReport } from '@/hooks/useDashboard'
import { DashboardCard } from '@/features/dashboard/DashboardCard'
import { CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { DateRangePicker, type DateRangeValue } from '@/components/DateRangePicker'
import { formatDate } from '@/lib/format'
import type { ManagerFollowupReportRow, ManagerFollowupReportParams } from '@/services/dashboard'

type Preset = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM'

const PRESET_LABELS: Record<Preset, string> = {
  THIS_MONTH: 'This Month',
  LAST_MONTH: 'Last Month',
  THIS_YEAR: 'This Year',
  CUSTOM: 'Custom Range',
}

function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** period.month/period.year are already the server's IST-anchored idea of
 * "now" (see usePeriodSelector) — day=1 here is just a calendar anchor for
 * date-fns's month/year math, never read for its own time-of-day. Mirrors
 * DonationEngagementReport.tsx's identical resolveDateRange. */
function resolveDateRange(
  preset: Preset,
  period: { month: number; year: number } | null,
  customRange: DateRangeValue | undefined,
): ManagerFollowupReportParams | undefined {
  if (preset === 'CUSTOM') return customRange ? { dateFrom: customRange.from, dateTo: customRange.to } : undefined
  if (!period) return undefined
  const anchor = new Date(period.year, period.month - 1, 1)
  if (preset === 'THIS_MONTH') return { dateFrom: toISO(startOfMonth(anchor)), dateTo: toISO(endOfMonth(anchor)) }
  if (preset === 'LAST_MONTH') {
    const lastMonth = subMonths(anchor, 1)
    return { dateFrom: toISO(startOfMonth(lastMonth)), dateTo: toISO(endOfMonth(lastMonth)) }
  }
  return { dateFrom: toISO(startOfYear(anchor)), dateTo: toISO(endOfYear(anchor)) }
}

function managerHref(managerId: string, status?: string): string {
  const params = new URLSearchParams({ tab: 'history', managerId })
  if (status) params.set('status', status)
  return `/admin/followups?${params.toString()}`
}

function StatCell({ value, href }: { value: number; href?: string }) {
  if (!href || value === 0) return <span className="tabular-nums">{value}</span>
  return (
    <Link to={href} className="tabular-nums text-primary hover:underline">
      {value}
    </Link>
  )
}

function ManagerReportCard({ row }: { row: ManagerFollowupReportRow }) {
  const closedOther = row.notInterestedCount + row.callbackRequiredCount + row.otherCount
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{row.managerName}</p>
        <Link to={`/admin/members?manager=${row.managerId}`} className="text-xs text-primary hover:underline">
          {row.assignedMembers} member{row.assignedMembers === 1 ? '' : 's'}
        </Link>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">Pending</dt>
          <dd>
            <StatCell value={row.pendingCount} href={`/admin/members?manager=${row.managerId}`} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">Started</dt>
          <dd>
            <StatCell value={row.startedCount} href={managerHref(row.managerId, 'STARTED')} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">In Progress</dt>
          <dd>
            <StatCell value={row.inProgressCount} href={managerHref(row.managerId, 'IN_PROGRESS')} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">Completed</dt>
          <dd>
            <StatCell value={row.completedCount} href={managerHref(row.managerId, 'COMPLETED')} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">Not Interested / Callback / Other</dt>
          <dd>
            <StatCell value={closedOther} href={managerHref(row.managerId)} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">Total Follow-ups</dt>
          <dd>
            <StatCell value={row.totalFollowups} href={managerHref(row.managerId)} />
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function ManagerFollowupReport() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { period } = usePeriodSelector()

  const presetParam = searchParams.get('mfrPreset')
  const preset: Preset = presetParam && presetParam in PRESET_LABELS ? (presetParam as Preset) : 'THIS_MONTH'
  const dateFrom = searchParams.get('mfrFrom')
  const dateTo = searchParams.get('mfrTo')
  // Memoized on the primitive from/to strings — see
  // DonationEngagementReport.tsx's identical customRange for why (keeps
  // the params useMemo below from recomputing every render).
  const customRange: DateRangeValue | undefined = useMemo(
    () => (dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined),
    [dateFrom, dateTo],
  )

  function updateParams(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '') next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next, { replace: true })
  }

  const params = useMemo(() => resolveDateRange(preset, period, customRange), [preset, period, customRange])
  const { data: rows, isLoading, isError, refetch } = useManagerFollowupReport(params)

  // Matches the request's own summary-card scope exactly (Pending/In
  // Progress/Completed only) — Started has its own table column but no
  // separate summary card, and "In Progress" here is that status alone,
  // not combined with Started, so it stays consistent with the table.
  const totals = (rows ?? []).reduce(
    (acc, r) => {
      acc.pending += r.pendingCount
      acc.inProgress += r.inProgressCount
      acc.completed += r.completedCount
      return acc
    },
    { pending: 0, inProgress: 0, completed: 0 },
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={preset} onValueChange={(v) => updateParams({ mfrPreset: v === 'THIS_MONTH' ? undefined : v })}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PRESET_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {preset === 'CUSTOM' && (
          <DateRangePicker
            value={customRange}
            onChange={(v) => updateParams({ mfrFrom: v?.from, mfrTo: v?.to })}
          />
        )}

        {params?.dateFrom && params?.dateTo && (
          <p className="text-xs text-muted-foreground">
            {formatDate(params.dateFrom)} – {formatDate(params.dateTo)}
          </p>
        )}
      </div>

      {preset === 'CUSTOM' && !customRange && <EmptyState title="Pick a date range to see this report." />}

      {isLoading && <CardListSkeleton count={4} />}
      {isError && <ErrorState message="Unable to load the manager follow-up report." onRetry={refetch} />}

      {rows && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DashboardCard label="Pending" value={totals.pending} icon={Hourglass} tone="warning" />
          <DashboardCard label="In Progress" value={totals.inProgress} icon={ClipboardList} tone="info" />
          <DashboardCard label="Completed" value={totals.completed} icon={CheckCircle2} tone="success" />
        </div>
      )}

      {rows && rows.length === 0 && (
        <EmptyState icon={<Users className="size-8" />} title="No active managers found." />
      )}

      {rows && rows.length > 0 && (
        <>
          <div className="space-y-2 md:hidden">
            {rows.map((row) => (
              <ManagerReportCard key={row.managerId} row={row} />
            ))}
          </div>

          <Table className="hidden md:block">
            <TableHeader>
              <TableRow>
                <TableHead>Manager</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>In Progress</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Not Interested / Callback / Other</TableHead>
                <TableHead>Total Follow-ups</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const closedOther = row.notInterestedCount + row.callbackRequiredCount + row.otherCount
                return (
                  <TableRow key={row.managerId} className="border-b last:border-0">
                    <TableCell className="font-medium">{row.managerName}</TableCell>
                    <TableCell>
                      <StatCell value={row.assignedMembers} href={`/admin/members?manager=${row.managerId}`} />
                    </TableCell>
                    <TableCell>
                      <StatCell value={row.pendingCount} href={`/admin/members?manager=${row.managerId}`} />
                    </TableCell>
                    <TableCell>
                      <StatCell value={row.startedCount} href={managerHref(row.managerId, 'STARTED')} />
                    </TableCell>
                    <TableCell>
                      <StatCell value={row.inProgressCount} href={managerHref(row.managerId, 'IN_PROGRESS')} />
                    </TableCell>
                    <TableCell>
                      <StatCell value={row.completedCount} href={managerHref(row.managerId, 'COMPLETED')} />
                    </TableCell>
                    <TableCell>
                      <StatCell value={closedOther} href={managerHref(row.managerId)} />
                    </TableCell>
                    <TableCell>
                      <StatCell value={row.totalFollowups} href={managerHref(row.managerId)} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  )
}
