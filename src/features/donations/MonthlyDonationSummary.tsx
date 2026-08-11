import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PeriodSelector } from '@/components/PeriodSelector'
import { DonationStatusBadge } from '@/components/StatusBadge'
import { formatINR } from '@/lib/format'
import type { Donation, Period } from '@/types'

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  ONLINE: 'Online',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
}

/** Donation-only monthly rollup — shown above the complete donation history
 * so a manager can see "did this member donate this month" without having
 * to scan the full list. Independent of follow-up status (see
 * FollowupHistoryList for that side of the month). */
export function MonthlyDonationSummary({
  period,
  onPeriodChange,
  donations,
}: {
  period: Period
  onPeriodChange: (period: Period) => void
  donations: Donation[]
}) {
  const total = donations.reduce((sum, d) => sum + Number(d.amount_inr), 0)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Monthly Summary</CardTitle>
        <PeriodSelector period={period} onChange={onPeriodChange} />
      </CardHeader>
      <CardContent className="space-y-3">
        <DonationStatusBadge
          received={donations.length > 0}
          label={donations.length > 0 ? formatINR(total) : undefined}
        />
        {donations.length > 0 && (
          <div className="space-y-1 border-t pt-3 text-sm text-muted-foreground">
            {donations.map((d) => (
              <p key={d.id}>
                {formatINR(d.amount_inr)} via {PAYMENT_LABELS[d.payment_method]}
                {d.transaction_reference ? ` · Ref: ${d.transaction_reference}` : ''}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
