import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Upload, UserX, Users, FileWarning } from 'lucide-react'
import { useMembers, useUnassignedMembersCount, useIncompleteMembersCount, useMemberLastDonationDates } from '@/hooks/useMembers'
import { useManagers } from '@/hooks/useManagers'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { MembersFilterBar } from '@/features/members/MembersFilterBar'
import { AdminMemberCard, AdminMemberTableRow } from '@/features/members/AdminMemberRow'
import { MemberFormDialog } from '@/features/members/MemberFormDialog'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { CardListSkeleton, TableSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { MemberStatus } from '@/types'

const UNASSIGNED = 'UNASSIGNED'

export default function AdminMembersPage() {
  const [filters, setFilters] = useUrlFilters({
    search: '',
    status: 'ALL' as MemberStatus | 'ALL',
    manager: 'ALL',
    incomplete: false as boolean,
    page: 1,
  })
  const { search, status, manager: managerId, incomplete, page } = filters
  const debouncedSearch = useDebouncedValue(search)

  const { data: managers = [] } = useManagers()
  const { data: unassignedCount = 0 } = useUnassignedMembersCount()
  const { data: incompleteCount = 0 } = useIncompleteMembersCount()
  const { pageSize } = useDefaultPageSize()
  // Only ever re-run when the page size setting itself changes, not on
  // every filter change (setFilters is a fresh closure every render).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setFilters({ page: 1 }), [pageSize])
  const { data, isLoading, isError, refetch } = useMembers({
    search: debouncedSearch,
    status: status === 'ALL' ? undefined : status,
    managerId: managerId === 'ALL' || managerId === UNASSIGNED ? undefined : managerId,
    unassigned: managerId === UNASSIGNED,
    incomplete,
    page,
    pageSize,
  })

  const { data: lastDonationDates } = useMemberLastDonationDates(
    status === 'INACTIVE' ? (data?.rows.map((m) => m.id) ?? []) : [],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Members"
        description={data ? `${data.count} member${data.count === 1 ? '' : 's'} across the foundation` : undefined}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/members/import">
                <Upload className="size-4" /> Import
              </Link>
            </Button>
            <MemberFormDialog />
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <MembersFilterBar
            search={search}
            onSearchChange={(v) => setFilters({ search: v, page: 1 })}
            status={status}
            onStatusChange={(v) => setFilters({ status: v, page: 1 })}
          />
        </div>
        <Select
          value={managerId}
          onValueChange={(v) => setFilters({ manager: v, page: 1 })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All managers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All managers</SelectItem>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {unassignedCount > 0 && (
          <button
            type="button"
            onClick={() => setFilters({ manager: UNASSIGNED, page: 1 })}
            className="flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning-foreground transition-colors hover:bg-warning/20"
          >
            <UserX className="size-3.5" /> {unassignedCount} Unassigned
          </button>
        )}

        {incompleteCount > 0 && (
          <button
            type="button"
            onClick={() => setFilters({ incomplete: !incomplete, page: 1 })}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              incomplete
                ? 'border-gold bg-gold/20 text-gold-foreground'
                : 'border-gold/40 bg-gold/10 text-gold-foreground hover:bg-gold/20',
            )}
          >
            <FileWarning className="size-3.5" /> {incompleteCount} Incomplete
          </button>
        )}
      </div>

      {isLoading && (
        <>
          <div className="md:hidden">
            <CardListSkeleton />
          </div>
          <div className="hidden md:block">
            <TableSkeleton cols={7} />
          </div>
        </>
      )}
      {isError && <ErrorState message="Unable to load members. Please try again." onRetry={refetch} />}
      {data && data.rows.length === 0 && (
        <EmptyState icon={<Users className="size-8" />} title="No members match your filters." />
      )}

      {data && data.rows.length > 0 && (
        <>
          <div className="space-y-2 md:hidden">
            {data.rows.map((member) => (
              <AdminMemberCard
                key={member.id}
                member={member}
                managerName={managers.find((m) => m.id === member.assigned_manager_id)?.full_name}
                showMissingFields={incomplete}
                lastDonationDates={lastDonationDates}
              />
            ))}
          </div>

          <Table className="hidden md:block">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Father's Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((member) => (
                <AdminMemberTableRow
                  key={member.id}
                  member={member}
                  managers={managers}
                  showMissingFields={incomplete}
                  lastDonationDates={lastDonationDates}
                />
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {data && (
        <Pagination page={page} pageSize={pageSize} total={data.count} onPageChange={(p) => setFilters({ page: p })} />
      )}
    </div>
  )
}
