import { useEffect, useState } from 'react'
import { UserCog, Search } from 'lucide-react'
import { usePaginatedManagers } from '@/hooks/useManagers'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { ManagerFormDialog } from '@/features/managers/ManagerFormDialog'
import { ManagerStatusControl } from '@/features/managers/ManagerStatusControl'
import { MemberStatusBadge } from '@/components/StatusBadge'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState } from '@/components/StateViews'
import { Input } from '@/components/ui/input'

export default function ManagersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)
  const { pageSize } = useDefaultPageSize()
  useEffect(() => setPage(1), [pageSize])
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
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search managers…"
          className="pl-9"
        />
      </div>

      {isLoading && <CardListSkeleton />}
      {managers && managers.length === 0 && (
        <EmptyState icon={<UserCog className="size-8" />} title="No managers found." />
      )}

      {managers && managers.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {managers.map((manager) => (
            <div key={manager.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{manager.full_name}</p>
                  <p className="text-sm text-muted-foreground">{manager.phone}</p>
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
      )}

      {data && <Pagination page={page} pageSize={pageSize} total={data.count} onPageChange={setPage} />}
    </div>
  )
}
