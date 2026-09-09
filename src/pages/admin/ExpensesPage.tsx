import { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { useExpenses } from '@/hooks/useExpenses'
import { useFunds } from '@/hooks/useFunds'
import { useExpenseCategories } from '@/hooks/useExpenseCategories'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { TableSkeleton, CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { ExpenseStatusBadge } from '@/components/StatusBadge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { AddExpenseDialog } from '@/features/expenses/AddExpenseDialog'
import { FundBalancesStrip } from '@/features/expenses/FundBalancesStrip'
import { ExpenseActions } from '@/features/expenses/ExpenseActions'
import { ExpenseListItem } from '@/features/expenses/ExpenseListItem'
import { quorumProgressLabel } from '@/features/expenses/quorumProgress'
import { formatDate, formatINR } from '@/lib/format'
import type { ExpenseStatus } from '@/types'

export default function AdminExpensesPage() {
  const [filters, setFilters] = useUrlFilters({
    search: '',
    fundId: 'ALL',
    categoryId: 'ALL',
    status: 'ALL' as ExpenseStatus | 'ALL',
    page: 1,
  })
  const { search, fundId, categoryId, status, page } = filters
  const debouncedSearch = useDebouncedValue(search)

  const { data: funds = [] } = useFunds()
  const { data: categories = [] } = useExpenseCategories()
  const { pageSize } = useDefaultPageSize()
  // Only reset to page 1 on a genuine pageSize change, never on the first
  // render's loading-fallback-to-real-value jump — see
  // admin/MembersPage.tsx's matching comment for the full reasoning.
  const previousPageSizeRef = useRef<number | null>(null)
  useEffect(() => {
    if (previousPageSizeRef.current !== null && previousPageSizeRef.current !== pageSize) {
      setFilters({ page: 1 })
    }
    previousPageSizeRef.current = pageSize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize])

  const { data, isLoading, isError, refetch } = useExpenses({
    search: debouncedSearch,
    fundId: fundId === 'ALL' ? undefined : fundId,
    categoryId: categoryId === 'ALL' ? undefined : categoryId,
    status,
    page,
    pageSize,
  })

  function handlePageChange(nextPage: number) {
    setFilters({ page: nextPage })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expenses"
        description={data ? `${data.count} expense${data.count === 1 ? '' : 's'} recorded` : undefined}
      />

      <FundBalancesStrip />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setFilters({ search: e.target.value, page: 1 })}
            placeholder="Search purpose, number, payee…"
            className="w-56 pl-9"
          />
        </div>
        <Select value={fundId} onValueChange={(v) => setFilters({ fundId: v, page: 1 })}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All funds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All funds</SelectItem>
            {funds.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={(v) => setFilters({ categoryId: v, page: 1 })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setFilters({ status: v as ExpenseStatus | 'ALL', page: 1 })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SUBMITTED">Pending Approval</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <AddExpenseDialog />
      </div>

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
      {isError && <ErrorState message="Unable to load expenses. Please try again." onRetry={refetch} />}
      {data && data.rows.length === 0 && (
        <EmptyState title="No expenses recorded yet." description={debouncedSearch ? 'Try a different search.' : undefined} />
      )}

      {data && data.rows.length > 0 && (
        <>
          <div className="space-y-2 md:hidden">
            {data.rows.map((expense) => (
              <ExpenseListItem key={expense.id} expense={expense} actions={<ExpenseActions expense={expense} />} />
            ))}
          </div>

          <Table className="hidden md:block">
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Fund / Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((expense) => (
                <TableRow key={expense.id} className="border-b last:border-0">
                  <TableCell className="whitespace-nowrap font-medium">{expense.expense_number}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(expense.expense_date)}</TableCell>
                  <TableCell>
                    <p className="max-w-64 truncate">{expense.purpose}</p>
                    {expense.paid_to && <p className="text-xs text-muted-foreground">Paid to {expense.paid_to}</p>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {expense.fund?.name}
                    <br />
                    <span className="text-xs">{expense.category?.name}</span>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">{formatINR(expense.amount_inr)}</TableCell>
                  <TableCell>
                    <ExpenseStatusBadge status={expense.status} />
                    {quorumProgressLabel(expense) && (
                      <p className="mt-0.5 max-w-52 text-xs text-muted-foreground">{quorumProgressLabel(expense)}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      <ExpenseActions expense={expense} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {data && <Pagination page={page} pageSize={pageSize} total={data.count} onPageChange={handlePageChange} />}
    </div>
  )
}
