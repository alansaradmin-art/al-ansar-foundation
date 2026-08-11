import { formatINR, monthName } from '@/lib/format'
import type { MonthWiseReportRow } from '@/services/dashboard'

export function MonthlyBarChart({ rows }: { rows: MonthWiseReportRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.donation_amount))

  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-2" role="img" aria-label="Monthly donation totals">
      {rows.map((row) => (
        <div key={row.month} className="flex w-14 shrink-0 flex-col items-center gap-1.5">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {row.donation_amount > 0 ? formatINR(row.donation_amount) : ''}
          </span>
          <div className="flex h-32 w-full items-end rounded-md bg-muted/40">
            <div
              className="w-full rounded-md bg-primary"
              style={{ height: `${(row.donation_amount / max) * 100}%`, minHeight: row.donation_amount > 0 ? 4 : 0 }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground">{monthName(row.month).slice(0, 3)}</span>
        </div>
      ))}
    </div>
  )
}
