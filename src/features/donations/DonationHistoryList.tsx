import { IndianRupee } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/StateViews'
import { ReceiptViewDialog } from './receipt/ReceiptViewDialog'
import { formatDate, formatINR } from '@/lib/format'
import type { DonationWithRecorder } from '@/services/donations'
import type { Member } from '@/types'

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  ONLINE: 'Online',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
}

const DONATION_TYPE_LABELS: Record<string, string> = {
  ZAKAT: 'Zakat',
  SADAQAH: 'Sadaqah/Sadka',
  FITRA: 'Fitra',
  GENERAL: 'General Donation',
  OTHER: 'Other',
}

function DonationRow({
  donation: d,
  member,
}: {
  donation: DonationWithRecorder
  member: Pick<Member, 'member_name' | 'member_id' | 'mobile_number' | 'mobile_country'>
}) {
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gold/25 text-gold-foreground">
        <IndianRupee className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{formatDate(d.donation_date)}</p>
        <p className="text-sm text-muted-foreground">
          {DONATION_TYPE_LABELS[d.donation_type]} · {PAYMENT_LABELS[d.payment_method]}
          {d.transaction_reference ? ` · Ref: ${d.transaction_reference}` : ''}
        </p>
        {d.notes && <p className="text-sm text-muted-foreground">{d.notes}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-display font-semibold tabular-nums">{formatINR(d.amount_inr)}</span>
        <ReceiptViewDialog donation={d} member={member} />
      </div>
    </li>
  )
}

export function DonationHistoryList({
  donations,
  member,
  showTitle = true,
}: {
  donations: DonationWithRecorder[]
  /** Every donation in this list already belongs to this one member — no
   * per-row anonymous-donor case here (unlike the admin/manager lists). */
  member: Pick<Member, 'member_name' | 'member_id' | 'mobile_number' | 'mobile_country'>
  showTitle?: boolean
}) {
  const body = donations.length === 0 ? (
    <EmptyState title="No donations recorded for this member." />
  ) : (
    <ul className="divide-y">
      {donations.map((d) => (
        <DonationRow key={d.id} donation={d} member={member} />
      ))}
    </ul>
  )

  if (!showTitle) return body

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Donation History</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  )
}
