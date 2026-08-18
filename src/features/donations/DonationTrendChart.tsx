import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { computeMonthlyTrend } from '@/lib/memberFinancials'
import { formatINR, monthName } from '@/lib/format'
import type { Donation } from '@/types'

/** Plain CSS bars, not a charting library — none exists in this project and
 * a single member's 12-month trend doesn't need one. */
export function DonationTrendChart({ donations }: { donations: Donation[] }) {
  const points = computeMonthlyTrend(donations, 12)
  const max = Math.max(1, ...points.map((p) => p.total))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Contribution Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-32 items-end gap-1.5">
          {points.map((p) => (
            <div key={`${p.year}-${p.month}`} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm bg-gold/70"
                style={{ height: `${Math.max(3, (p.total / max) * 100)}%` }}
                title={`${monthName(p.month)} ${p.year}: ${formatINR(p.total)}`}
              />
              <span className="text-[10px] text-muted-foreground">{monthName(p.month).slice(0, 1)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
