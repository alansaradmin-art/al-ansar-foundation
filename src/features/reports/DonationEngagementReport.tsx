import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpDown, ChevronDown, ChevronUp, Download, IndianRupee, Search, UserCheck, Users, UserX } from 'lucide-react'
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, format } from 'date-fns'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useDonationEngagementReport } from '@/hooks/useDashboard'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { DashboardCard } from '@/features/dashboard/DashboardCard'
import { Pagination } from '@/components/Pagination'
import { CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { DonationStatusBadge, UnassignedManagerBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker, type DateRangeValue } from '@/components/DateRangePicker'
import { formatDate, formatINR, formatMobileNumber } from '@/lib/format'
import { toCsv, downloadCsv } from '@/lib/csv'
import type { DonationEngagementParams, DonationEngagementRow } from '@/services/dashboard'

type Preset = 'THIS_MONTH' | 'LAST_2_MONTHS' | 'THIS_YEAR' | 'NEVER_DONATED' | 'CUSTOM'

const PRESET_LABELS: Record<Preset, string> = {
  THIS_MONTH: 'This Month',
  LAST_2_MONTHS: 'Last 2 Months',
  THIS_YEAR: 'This Year',
  NEVER_DONATED: 'Never Donated',
  CUSTOM: 'Custom Range',
}

type StatusFilter = 'ALL' | 'DONATED' | 'NOT_DONATED'

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  ALL: 'All Statuses',
  DONATED: 'Donated',
  NOT_DONATED: 'Not Donated',
}

/** Maps the Dashboard's deep-link ?status= value to this filter — kept
 * separate from STATUS_FILTER_LABELS' keys since the URL uses a shorter,
 * link-friendly spelling ("notDonated") than the internal enum. */
function statusFilterFromParam(value: string | null): StatusFilter {
  if (value === 'notDonated') return 'NOT_DONATED'
  if (value === 'donated') return 'DONATED'
  return 'ALL'
}

type SortKey =
  | 'memberName'
  | 'fatherName'
  | 'mobileNumber'
  | 'managerName'
  | 'donated'
  | 'totalAmount'
  | 'donationCount'
  | 'latestDonationDate'
const PAGE_SIZE = 25

function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** period.month/period.year are already the server's IST-anchored idea of
 * "now" (see usePeriodSelector) — day=1 here is just a calendar anchor for
 * date-fns's month/year math, never read for its own time-of-day. */
function resolveDateRange(
  preset: Preset,
  period: { month: number; year: number } | null,
  customRange: DateRangeValue | undefined,
): DonationEngagementParams | undefined {
  if (preset === 'NEVER_DONATED') return { neverDonated: true }
  if (preset === 'CUSTOM') return customRange ? { dateFrom: customRange.from, dateTo: customRange.to } : undefined
  if (!period) return undefined
  const anchor = new Date(period.year, period.month - 1, 1)
  if (preset === 'THIS_MONTH') return { dateFrom: toISO(startOfMonth(anchor)), dateTo: toISO(endOfMonth(anchor)) }
  if (preset === 'LAST_2_MONTHS') {
    return { dateFrom: toISO(startOfMonth(subMonths(anchor, 1))), dateTo: toISO(endOfMonth(anchor)) }
  }
  return { dateFrom: toISO(startOfYear(anchor)), dateTo: toISO(endOfYear(anchor)) }
}

function compareRows(a: DonationEngagementRow, b: DonationEngagementRow, key: SortKey): number {
  switch (key) {
    case 'donated':
      return Number(a.donated) - Number(b.donated)
    case 'totalAmount':
      return a.totalAmount - b.totalAmount
    case 'donationCount':
      return a.donationCount - b.donationCount
    case 'latestDonationDate':
      return (a.latestDonationDate ?? '').localeCompare(b.latestDonationDate ?? '')
    case 'fatherName':
      return (a.fatherName ?? '').localeCompare(b.fatherName ?? '')
    case 'mobileNumber':
      return (a.mobileNumber ?? '').localeCompare(b.mobileNumber ?? '')
    case 'managerName':
      return (a.managerName ?? '').localeCompare(b.managerName ?? '')
    default:
      return a.memberName.localeCompare(b.memberName)
  }
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  dir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
}) {
  const isActive = activeKey === sortKey
  return (
    <th className="p-3 font-medium">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {isActive ? (
          dir === 'asc' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </button>
    </th>
  )
}

function EngagementRowCard({ row }: { row: DonationEngagementRow }) {
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={`/admin/members/${row.memberId}`} className="font-medium hover:underline">
            {row.memberName}
          </Link>
          {(() => {
            const subline = [row.fatherName, formatMobileNumber(row.mobileNumber)].filter(Boolean).join(' · ')
            return subline && <p className="text-xs text-muted-foreground">{subline}</p>
          })()}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.managerName ?? <UnassignedManagerBadge />}
          </p>
        </div>
        <DonationStatusBadge received={row.donated} label={row.donated ? 'Donated' : 'Not Donated'} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-display font-semibold tabular-nums">{formatINR(row.totalAmount)}</span>
        <span className="text-muted-foreground">
          {row.donationCount} donation{row.donationCount === 1 ? '' : 's'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Last donation: {row.latestDonationDate ? formatDate(row.latestDonationDate) : 'Never'}
      </p>
    </div>
  )
}

export function DonationEngagementReport() {
  const [searchParams] = useSearchParams()
  const { period } = usePeriodSelector()
  const [preset, setPreset] = useState<Preset>('THIS_MONTH')
  const [customRange, setCustomRange] = useState<DateRangeValue | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(statusFilterFromParam(searchParams.get('status')))
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [sortKey, setSortKey] = useState<SortKey>('memberName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const params = useMemo(() => resolveDateRange(preset, period, customRange), [preset, period, customRange])
  const { data: rows, isLoading, isError, refetch } = useDonationEngagementReport(params)
  const debouncedSearch = useDebouncedValue(search)

  const filtered = useMemo(() => {
    const list = rows ?? []
    const byStatus =
      statusFilter === 'ALL' ? list : list.filter((r) => (statusFilter === 'DONATED' ? r.donated : !r.donated))
    const q = debouncedSearch.trim().toLowerCase()
    const searched = !q
      ? byStatus
      : byStatus.filter(
          (r) =>
            r.memberName.toLowerCase().includes(q) ||
            (r.fatherName ?? '').toLowerCase().includes(q) ||
            (r.mobileNumber ?? '').toLowerCase().includes(q) ||
            (r.managerName ?? '').toLowerCase().includes(q),
        )
    const sorted = [...searched].sort((a, b) => compareRows(a, b, sortKey) * (sortDir === 'asc' ? 1 : -1))
    return sorted
  }, [rows, statusFilter, debouncedSearch, sortKey, sortDir])

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalMembers = rows?.length ?? 0
  const donatedCount = rows?.filter((r) => r.donated).length ?? 0
  const notDonatedCount = totalMembers - donatedCount
  const totalAmount = rows?.reduce((sum, r) => sum + r.totalAmount, 0) ?? 0

  function handlePresetChange(value: string) {
    setPreset(value as Preset)
    setPage(1)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  function handleExport() {
    const csv = toCsv<DonationEngagementRow>(filtered, [
      { key: 'member', label: 'Member Name', value: (r) => r.memberName },
      { key: 'father', label: "Father's Name", value: (r) => r.fatherName ?? '' },
      { key: 'mobile', label: 'Mobile Number', value: (r) => formatMobileNumber(r.mobileNumber) },
      { key: 'manager', label: 'Manager', value: (r) => r.managerName ?? 'Unassigned' },
      { key: 'status', label: 'Donation Status', value: (r) => (r.donated ? 'Donated' : 'Not Donated') },
      { key: 'amount', label: 'Total Amount (INR)', value: (r) => r.totalAmount },
      { key: 'count', label: 'Donation Count', value: (r) => r.donationCount },
      { key: 'latest', label: 'Latest Donation Date', value: (r) => r.latestDonationDate ?? '' },
    ])
    downloadCsv(`donation-engagement-${preset.toLowerCase()}.csv`, csv)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-48">
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
            onChange={(v) => {
              setCustomRange(v)
              setPage(1)
            }}
          />
        )}

        {preset !== 'NEVER_DONATED' && (
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilter)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_FILTER_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {params?.dateFrom && params?.dateTo && (
          <p className="text-xs text-muted-foreground">
            {formatDate(params.dateFrom)} – {formatDate(params.dateTo)}
          </p>
        )}

        <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0} className="ml-auto">
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      {preset === 'CUSTOM' && !customRange && (
        <EmptyState title="Pick a date range to see this report." />
      )}

      {isLoading && <CardListSkeleton count={4} />}
      {isError && <ErrorState message="Unable to load the donation engagement report." onRetry={refetch} />}

      {rows && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DashboardCard label="Active Members" value={totalMembers} icon={Users} tone="primary" />
          {preset === 'NEVER_DONATED' ? (
            <DashboardCard label="Never Donated" value={notDonatedCount} icon={UserX} tone="warning" />
          ) : (
            <>
              <DashboardCard label="Donated" value={donatedCount} icon={UserCheck} tone="success" />
              <DashboardCard label="Not Donated" value={notDonatedCount} icon={UserX} tone="warning" />
              <DashboardCard label="Amount Collected" value={formatINR(totalAmount)} icon={IndianRupee} tone="gold" />
            </>
          )}
        </div>
      )}

      {rows && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search by member, father's name, mobile, or manager…"
            className="pl-9"
          />
        </div>
      )}

      {rows && rows.length === 0 && <EmptyState title="No active members match this filter." />}
      {rows && rows.length > 0 && filtered.length === 0 && (
        <EmptyState title="No members match your search." description="Try a different search term." />
      )}

      {pageRows.length > 0 && (
        <>
          <div className="space-y-2 md:hidden">
            {pageRows.map((row) => (
              <EngagementRowCard key={row.memberId} row={row} />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <SortableHeader label="Member" sortKey="memberName" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortableHeader
                    label="Father's Name"
                    sortKey="fatherName"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Mobile"
                    sortKey="mobileNumber"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Manager"
                    sortKey="managerName"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader label="Status" sortKey="donated" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortableHeader
                    label="Total Amount"
                    sortKey="totalAmount"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Donations"
                    sortKey="donationCount"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Latest Donation"
                    sortKey="latestDonationDate"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.memberId} className="border-b last:border-0">
                    <td className="p-3">
                      <Link to={`/admin/members/${row.memberId}`} className="font-medium hover:underline">
                        {row.memberName}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">{row.fatherName || '—'}</td>
                    <td className="p-3 text-muted-foreground">{formatMobileNumber(row.mobileNumber) || '—'}</td>
                    <td className="p-3 text-muted-foreground">{row.managerName ?? <UnassignedManagerBadge />}</td>
                    <td className="p-3">
                      <DonationStatusBadge received={row.donated} label={row.donated ? 'Donated' : 'Not Donated'} />
                    </td>
                    <td className="p-3 tabular-nums">{formatINR(row.totalAmount)}</td>
                    <td className="p-3 tabular-nums">{row.donationCount}</td>
                    <td className="p-3 text-muted-foreground">
                      {row.latestDonationDate ? formatDate(row.latestDonationDate) : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {filtered.length > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      )}
    </div>
  )
}
