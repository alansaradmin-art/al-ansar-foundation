import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useAdminFollowups, useAdminOpenFollowups, useOverdueFollowups } from '@/hooks/useFollowups'
import { useManagers } from '@/hooks/useManagers'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { Badge } from '@/components/ui/badge'
import { TableSkeleton, CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { FollowupStatusBadge, UnassignedManagerBadge } from '@/components/StatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { FollowupListItem } from '@/features/followups/FollowupListItem'
import { formatDate } from '@/lib/format'
import { FOLLOW_UP_STATUSES } from '@/schemas/followup.schema'
import type { FollowUpStatus } from '@/types'
import type { OverdueFollowupRow } from '@/services/followups'

const STATUS_LABELS: Record<string, string> = {
  STARTED: 'Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  NOT_INTERESTED: 'Not Interested',
  CALLBACK_REQUIRED: 'Callback Required',
  OTHER: 'Other',
}

const METHOD_LABELS: Record<string, string> = {
  PHONE: 'Phone',
  WHATSAPP: 'WhatsApp',
  IN_PERSON: 'In Person',
  OTHER: 'Other',
}

const CONTACTED_LABELS: Record<string, string> = {
  MEMBER: 'Member',
  ADDED_BY: 'Added By',
  REFERENCE_CONTACT: 'Reference Contact',
  OTHER: 'Other',
}

const VALID_TABS = new Set(['overdue', 'inProgress', 'history'])

function FollowupSummaryRowCard({ row }: { row: OverdueFollowupRow }) {
  return (
    <Link
      to={`/admin/members/${row.memberId}`}
      className="block space-y-1.5 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{row.memberName}</p>
          {row.fatherName && <p className="text-xs text-muted-foreground">{row.fatherName}</p>}
        </div>
        {row.lastFollowUpStatus ? (
          <FollowupStatusBadge status={row.lastFollowUpStatus} />
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">No attempt this period</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {row.managerName ?? 'Unassigned'}
        {row.lastFollowUpDate ? ` · Last follow-up: ${formatDate(row.lastFollowUpDate)}` : ''}
      </p>
    </Link>
  )
}

/** Shared by Overdue and In Progress — both are member-per-row summaries of
 * the exact same shape (OverdueFollowupRow), just filtered by a different
 * predicate server-side (admin_overdue_followups vs admin_open_followups),
 * so they share one card/table rendering instead of two near-duplicates. */
function FollowupSummaryTable({ rows }: { rows: OverdueFollowupRow[] }) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <FollowupSummaryRowCard key={row.memberId} row={row} />
        ))}
      </div>

      <Table className="hidden md:block">
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Father's Name</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead>Last Follow-up</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.memberId} className="border-b last:border-0">
              <TableCell>
                <Link to={`/admin/members/${row.memberId}`} className="hover:underline">
                  {row.memberName}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{row.fatherName || '—'}</TableCell>
              <TableCell className="text-muted-foreground">{row.managerName ?? <UnassignedManagerBadge />}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.lastFollowUpDate ? formatDate(row.lastFollowUpDate) : '—'}
              </TableCell>
              <TableCell>
                {row.lastFollowUpStatus ? (
                  <FollowupStatusBadge status={row.lastFollowUpStatus} />
                ) : (
                  <span className="text-xs text-muted-foreground">No attempt this period</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

export default function AdminFollowupsPage() {
  const queryClient = useQueryClient()
  const { period, setPeriod } = usePeriodSelector()
  const [filters, setFilters] = useUrlFilters({
    tab: 'overdue',
    managerId: 'ALL',
    status: 'ALL' as FollowUpStatus | 'ALL',
    page: 1,
  })
  const tab = VALID_TABS.has(filters.tab) ? filters.tab : 'overdue'
  const { managerId, status, page } = filters

  const { data: managers = [] } = useManagers()
  const { pageSize } = useDefaultPageSize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setFilters({ page: 1 }), [pageSize])
  const scopedManagerId = managerId === 'ALL' ? undefined : managerId

  // Every tab's data is fetched once at page mount — switching tabs
  // re-fetches that tab's own data so a follow-up recorded elsewhere in
  // the same session shows up without a full reload.
  function handleTabChange(value: string) {
    setFilters({ tab: value })
    if (value === 'overdue') queryClient.invalidateQueries({ queryKey: ['followups', 'overdue'] })
    if (value === 'inProgress') queryClient.invalidateQueries({ queryKey: ['followups', 'admin-open'] })
    if (value === 'history') queryClient.invalidateQueries({ queryKey: ['followups', 'admin-list'] })
  }
  const { data, isLoading, isError, refetch } = useAdminFollowups({
    month: period?.month,
    year: period?.year,
    managerId: scopedManagerId,
    status: status === 'ALL' ? undefined : status,
    page,
    pageSize,
  })

  const {
    data: overdueRows,
    isLoading: isOverdueLoading,
    isError: isOverdueError,
    refetch: refetchOverdue,
  } = useOverdueFollowups(scopedManagerId, period?.month, period?.year)

  const {
    data: openRows,
    isLoading: isOpenLoading,
    isError: isOpenError,
    refetch: refetchOpen,
  } = useAdminOpenFollowups(scopedManagerId, period?.month, period?.year)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Follow-ups"
        description={data ? `${data.count} follow-up${data.count === 1 ? '' : 's'} recorded` : undefined}
        actions={period && <PeriodSelector period={period} onChange={setPeriod} />}
      />

      <Select value={managerId} onValueChange={(v) => setFilters({ managerId: v, page: 1 })}>
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

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overdue">
            Overdue
            {overdueRows && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {overdueRows.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="inProgress">
            In Progress
            {openRows && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {openRows.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            History
            {data && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {data.count}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overdue" className="space-y-4">
          {isOverdueLoading && (
            <>
              <div className="md:hidden">
                <CardListSkeleton />
              </div>
              <div className="hidden md:block">
                <TableSkeleton cols={5} />
              </div>
            </>
          )}
          {isOverdueError && (
            <ErrorState message="Unable to load overdue follow-ups. Please try again." onRetry={refetchOverdue} />
          )}
          {overdueRows && overdueRows.length === 0 && (
            <EmptyState title="No overdue follow-ups for this month." description="Everyone's up to date." />
          )}
          {overdueRows && overdueRows.length > 0 && <FollowupSummaryTable rows={overdueRows} />}
        </TabsContent>

        <TabsContent value="inProgress" className="space-y-4">
          {isOpenLoading && (
            <>
              <div className="md:hidden">
                <CardListSkeleton />
              </div>
              <div className="hidden md:block">
                <TableSkeleton cols={5} />
              </div>
            </>
          )}
          {isOpenError && (
            <ErrorState message="Unable to load in-progress follow-ups. Please try again." onRetry={refetchOpen} />
          )}
          {openRows && openRows.length === 0 && (
            <EmptyState title="Nothing in progress." description="Follow-ups managers start will show up here until they're completed." />
          )}
          {openRows && openRows.length > 0 && <FollowupSummaryTable rows={openRows} />}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Select value={status} onValueChange={(v) => setFilters({ status: v as FollowUpStatus | 'ALL' })}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {FOLLOW_UP_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isLoading && (
            <>
              <div className="md:hidden">
                <CardListSkeleton />
              </div>
              <div className="hidden md:block">
                <TableSkeleton cols={6} />
              </div>
            </>
          )}
          {isError && <ErrorState message="Unable to load follow-ups. Please try again." onRetry={refetch} />}
          {data && data.rows.length === 0 && <EmptyState title="No follow-ups recorded for this month." />}

          {data && data.rows.length > 0 && (
            <>
              <div className="space-y-2 md:hidden">
                {data.rows.map((f) => (
                  <FollowupListItem key={f.id} followup={f} href={`/admin/members/${f.member_id}`} showManager />
                ))}
              </div>

              <Table className="hidden md:block">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Contacted</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((f) => (
                    <TableRow key={f.id} className="border-b last:border-0">
                      <TableCell className="whitespace-nowrap">{formatDate(f.follow_up_date)}</TableCell>
                      <TableCell>
                        <Link to={`/admin/members/${f.member_id}`} className="hover:underline">
                          {f.member?.member_name}
                        </Link>
                        {f.member?.father_name && (
                          <p className="text-xs text-muted-foreground">{f.member.father_name}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{f.manager?.full_name}</TableCell>
                      <TableCell>
                        <FollowupStatusBadge status={f.follow_up_status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {f.follow_up_method ? METHOD_LABELS[f.follow_up_method] : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {f.contacted_person_type === 'OTHER'
                          ? f.contacted_person_name || 'Other'
                          : CONTACTED_LABELS[f.contacted_person_type ?? 'OTHER']}
                      </TableCell>
                      <TableCell className="max-w-56 text-muted-foreground">
                        {f.remarks ? <span className="line-clamp-2">{f.remarks}</span> : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          {data && (
            <Pagination page={page} pageSize={pageSize} total={data.count} onPageChange={(p) => setFilters({ page: p })} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
