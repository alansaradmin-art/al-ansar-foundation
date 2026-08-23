import { useEffect } from 'react'
import { UserCog, Search } from 'lucide-react'
import { usePaginatedManagers } from '@/hooks/useManagers'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { ManagerFormDialog } from '@/features/managers/ManagerFormDialog'
import { ManagerStatusControl } from '@/features/managers/ManagerStatusControl'
import { MemberStatusBadge } from '@/components/StatusBadge'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { CardListSkeleton, TableSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState } from '@/components/StateViews'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatMobileNumber } from '@/lib/format'

export default function ManagersPage() {
  const [filters, setFilters] = useUrlFilters({ search: '', page: 1 })
  const { search, page } = filters
  const debouncedSearch = useDebouncedValue(search)
  const { pageSize } = useDefaultPageSize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setFilters({ page: 1 }), [pageSize])
  const { data, isLoading } = usePaginatedManagers({ search: debouncedSearch, page, pageSize })
  const managers = data?.rows

  return (
    <div className="space-y-4">
      <PageHeader
        title="Managers"
        description={data ? `${data.count} manager${data.count === 1 ? '' : 's'}` : undefined}
        actions={<ManagerFormDialog />}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
          placeholder="Search managers…"
          className="pl-9"
        />
      </div>

      {isLoading && (
        <>
          <div className="space-y-2 md:hidden">
            <CardListSkeleton />
          </div>
          <div className="hidden md:block">
            <TableSkeleton cols={5} />
          </div>
        </>
      )}
      {managers && managers.length === 0 && (
        <EmptyState icon={<UserCog className="size-8" />} title="No managers found." />
      )}

      {managers && managers.length > 0 && (
        <>
          <div className="space-y-2 md:hidden">
            {managers.map((manager) => (
              <div key={manager.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{manager.full_name}</p>
                    <p className="text-sm text-muted-foreground">{formatMobileNumber(manager.phone, manager.phone_country)}</p>
                    <p className="text-sm text-muted-foreground">{manager.email}</p>
                  </div>
                  <MemberStatusBadge status={manager.status} />
                </div>
                <div className="flex gap-2">
                  <ManagerFormDialog manager={manager} />
                  <ManagerStatusControl manager={manager} />
                </div>
              </div>
            ))}
          </div>

          <Table className="hidden md:block">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managers.map((manager) => (
                <TableRow key={manager.id} className="border-b last:border-0">
                  <TableCell className="font-medium">{manager.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{formatMobileNumber(manager.phone, manager.phone_country)}</TableCell>
                  <TableCell className="text-muted-foreground">{manager.email}</TableCell>
                  <TableCell>
                    <MemberStatusBadge status={manager.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <ManagerFormDialog manager={manager} />
                      <ManagerStatusControl manager={manager} />
                    </div>
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
    </div>
  )
}
