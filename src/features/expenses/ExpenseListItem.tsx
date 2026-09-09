import type { ReactNode } from 'react'
import { Wallet } from 'lucide-react'
import { ExpenseStatusBadge } from '@/components/StatusBadge'
import { quorumProgressLabel } from './quorumProgress'
import { formatDate, formatINR } from '@/lib/format'
import type { ExpenseWithRelations } from '@/services/expenses'

export function ExpenseListItem({ expense, actions }: { expense: ExpenseWithRelations; actions?: ReactNode }) {
  const progress = quorumProgressLabel(expense)
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold/25 text-gold-foreground">
          <Wallet className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{expense.purpose}</p>
          <p className="text-xs text-muted-foreground">
            {expense.expense_number} · {formatDate(expense.expense_date)} · {expense.fund?.name} · {expense.category?.name}
          </p>
        </div>
        <span className="shrink-0 font-display font-semibold tabular-nums">{formatINR(expense.amount_inr)}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ExpenseStatusBadge status={expense.status} />
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {progress && <p className="text-xs text-muted-foreground">{progress}</p>}
      {expense.status === 'REJECTED' && expense.rejected_reason && (
        <p className="text-xs text-destructive">Rejected by {expense.rejecter?.full_name ?? 'a committee member'}: {expense.rejected_reason}</p>
      )}
    </div>
  )
}
