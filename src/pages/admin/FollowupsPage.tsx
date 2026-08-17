import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePeriodSelector } from '@/hooks/useCurrentPeriod'
import { useAdminFollowups, useOverdueFollowups } from '@/hooks/useFollowups'
import { useManagers } from '@/hooks/useManagers'
import { PeriodSelector } from '@/components/PeriodSelector'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { TableSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { FollowupStatusBadge, UnassignedManagerBadge } from '@/components/StatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/lib/format'
import { FOLLOW_UP_STATUSES } from '@/schemas/followup.schema'
import type { FollowUpStatus } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  COMPLETED: 'Completed',
  NOT_INTERESTED: 'Not Interested',
  CALLBACK_REQUIRED: 'Callback Required',
  OTHER: 'Other',
}

const VALID_TABS = new Set(['history', 'overdue'])

export default function AdminFollowupsPage() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab')
  const { period, setPeriod } = usePeriodSelector()
  const [managerId, setManagerId] = useState('ALL')
  const [status, setStatus] = useState<FollowUpStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)

  const { data: managers = [] } = useManagers()
  const scopedManagerId = managerId === 'ALL' ? undefined : managerId
  const { data, isLoading, isError, refetch } = useAdminFollowups({
    month: period?.month,
    year: period?.year,
    managerId: scopedManagerId,
    status: status === 'ALL' ? undefined : status,
    page,
    pageSize: 25,
  })

  const {
    data: overdueRows,
    isLoading: isOverdueLoading,
    isError: isOverdueError,
    refetch: refetchOverdue,
  } = useOverdueFollowups(scopedManagerId, period?.month, period?.year)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Follow-ups"
        description={data ? `${data.count} follow-up${data.count === 1 ? '' : 's'} recorded` : undefined}
        actions={period && <PeriodSelector period={period} onChange={setPeriod} />}
      />

      <Select
        value={managerId}
        onValueChange={(v) => {
          setManagerId(v)
          setPage(1)
        }}
      >
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

      <Tabs defaultValue={initialTab && VALID_TABS.has(initialTab) ? initialTab : 'history'}>
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Select value={status} onValueChange={(v) => setStatus(v as FollowUpStatus | 'ALL')}>
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

          {isLoading && <TableSkeleton cols={5} />}
          {isError && <ErrorState message="Unable to load follow-ups. Please try again." onRetry={refetch} />}
          {data && data.rows.length === 0 && <EmptyState title="No follow-ups recorded for this month." />}

          {data && data.rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Member</th>
                    <th className="p-3 font-medium">Manager</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Contacted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((f) => (
                    <tr key={f.id} className="border-b last:border-0">
                      <td className="p-3 whitespace-nowrap">{formatDate(f.follow_up_date)}</td>
                      <td className="p-3">
                        <Link to={`/admin/members/${f.member_id}`} className="hover:underline">
                          {f.member?.member_name}
                        </Link>
                        {f.member?.father_name && (
                          <p className="text-xs text-muted-foreground">{f.member.father_name}</p>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{f.manager?.full_name}</td>
                      <td className="p-3">
                        <FollowupStatusBadge status={f.follow_up_status} />
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {f.contacted_person_type === 'OTHER' ? f.contacted_person_name : f.contacted_person_type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && <Pagination page={page} pageSize={25} total={data.count} onPageChange={setPage} />}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          {isOverdueLoading && <TableSkeleton cols={5} />}
          {isOverdueError && (
            <ErrorState message="Unable to load overdue follow-ups. Please try again." onRetry={refetchOverdue} />
          )}
          {overdueRows && overdueRows.length === 0 && (
            <EmptyState title="No overdue follow-ups for this month." description="Everyone's up to date." />
          )}

          {overdueRows && overdueRows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Member</th>
                    <th className="p-3 font-medium">Father's Name</th>
                    <th className="p-3 font-medium">Manager</th>
                    <th className="p-3 font-medium">Last Follow-up</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueRows.map((row) => (
                    <tr key={row.memberId} className="border-b last:border-0">
                      <td className="p-3">
                        <Link to={`/admin/members/${row.memberId}`} className="hover:underline">
                          {row.memberName}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">{row.fatherName || '—'}</td>
                      <td className="p-3 text-muted-foreground">{row.managerName ?? <UnassignedManagerBadge />}</td>
                      <td className="p-3 text-muted-foreground">
                        {row.lastFollowUpDate ? formatDate(row.lastFollowUpDate) : '—'}
                      </td>
                      <td className="p-3">
                        {row.lastFollowUpStatus ? (
                          <FollowupStatusBadge status={row.lastFollowUpStatus} />
                        ) : (
                          <span className="text-xs text-muted-foreground">No attempt this period</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
