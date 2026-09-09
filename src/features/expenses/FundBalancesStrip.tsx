import { useFundBalances } from '@/hooks/useFunds'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Donations − Paid Expenses per active fund, computed live (§G of the
 * Expense Management Plan) — a quick "how much is actually left in each
 * fund" check right where expenses are recorded, without waiting for the
 * fuller Fund Report (Phase 5) or Dashboard cards (Phase 4). */
export function FundBalancesStrip() {
  const { data: balances, isLoading } = useFundBalances()

  if (isLoading) return null
  if (!balances || balances.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {balances.map((fund) => (
        <div key={fund.fund_id} className="flex shrink-0 flex-col gap-0.5 rounded-lg border bg-card px-3 py-2">
          <span className="text-xs text-muted-foreground">{fund.fund_name}</span>
          <span className={cn('font-display text-sm font-semibold tabular-nums', fund.balance < 0 && 'text-destructive')}>
            {formatINR(fund.balance)}
          </span>
        </div>
      ))}
    </div>
  )
}
