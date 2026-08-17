import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, UserX, Users } from 'lucide-react'
import { useMembers, useUnassignedMembersCount } from '@/hooks/useMembers'
import { useManagers } from '@/hooks/useManagers'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { MembersFilterBar } from '@/features/members/MembersFilterBar'
import { AdminMemberCard, AdminMemberTableRow } from '@/features/members/AdminMemberRow'
import { MemberFormDialog } from '@/features/members/MemberFormDialog'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { CardListSkeleton, TableSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MemberStatus } from '@/types'

const UNASSIGNED = 'UNASSIGNED'

export default function AdminMembersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<MemberStatus | 'ALL'>('ALL')
  const [managerId, setManagerId] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)

  const { data: managers = [] } = useManagers()
  const { data: unassignedCount = 0 } = useUnassignedMembersCount()
  const { data, isLoading, isError, refetch } = useMembers({
    search: debouncedSearch,
    status: status === 'ALL' ? undefined : status,
    managerId: managerId === 'ALL' || managerId === UNASSIGNED ? undefined : managerId,
    unassigned: managerId === UNASSIGNED,
    page,
    pageSize: 20,
  })

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
            onSearchChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
            status={status}
            onStatusChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
          />
        </div>
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
            onClick={() => {
              setManagerId(UNASSIGNED)
              setPage(1)
            }}
            className="flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning-foreground transition-colors hover:bg-warning/20"
          >
            <UserX className="size-3.5" /> {unassignedCount} Unassigned
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
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Father's Name</th>
                  <th className="p-3 font-medium">Mobile</th>
                  <th className="p-3 font-medium">Address</th>
                  <th className="p-3 font-medium">Manager</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((member) => (
                  <AdminMemberTableRow key={member.id} member={member} managers={managers} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data && <Pagination page={page} pageSize={20} total={data.count} onPageChange={setPage} />}
    </div>
  )
}
