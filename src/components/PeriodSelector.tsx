import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPeriod } from '@/lib/format'
import type { Period } from '@/types'

export function PeriodSelector({
  period,
  onChange,
}: {
  period: Period
  onChange: (period: Period) => void
}) {
  function shift(delta: number) {
    let month = period.month + delta
    let year = period.year
    if (month > 12) {
      month = 1
      year += 1
    } else if (month < 1) {
      month = 12
      year -= 1
    }
    onChange({ month, year })
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border bg-card p-1 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full text-muted-foreground hover:text-foreground"
        aria-label="Previous month"
        onClick={() => shift(-1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="flex min-w-32 items-center justify-center gap-1.5 text-center text-sm font-semibold tabular-nums">
        <Calendar className="size-3.5 text-primary" />
        {formatPeriod(period.month, period.year)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full text-muted-foreground hover:text-foreground"
        aria-label="Next month"
        onClick={() => shift(1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
