import { Link } from 'react-router-dom'
import { IndianRupee } from 'lucide-react'
import { formatDate, formatINR } from '@/lib/format'
import type { DonationWithRelations } from '@/services/donations'

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  ONLINE: 'Online',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
}

export function DonationListItem({ donation, memberHref }: { donation: DonationWithRelations; memberHref: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold/25 text-gold-foreground">
        <IndianRupee className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <Link to={memberHref} className="truncate font-medium hover:underline">
          {donation.member?.member_name ?? 'Unknown member'}
        </Link>
        <p className="text-xs text-muted-foreground">
          {formatDate(donation.donation_date)} · {PAYMENT_LABELS[donation.payment_method]}
          {donation.transaction_reference ? ` · Ref: ${donation.transaction_reference}` : ''}
        </p>
      </div>
      <span className="shrink-0 font-display font-semibold tabular-nums">{formatINR(donation.amount_inr)}</span>
    </div>
  )
}
