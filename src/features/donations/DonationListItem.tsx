import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IndianRupee } from 'lucide-react'
import { AnonymousDonationBadge } from '@/components/StatusBadge'
import { formatDate, formatINR } from '@/lib/format'
import type { DonationWithRelations } from '@/services/donations'

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

export function DonationListItem({
  donation,
  memberHref,
  actions,
}: {
  donation: DonationWithRelations
  /** Omit for an anonymous donation (donation.member is null) — renders
   * the same AnonymousDonationBadge the desktop table uses instead of a
   * dead link. Manager's own list never has anonymous donations. */
  memberHref?: string
  /** Optional row actions (e.g. Edit/Delete) — only Admin's cross-member
   * Donations list needs these; Manager's own list stays read-only. */
  actions?: ReactNode
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold/25 text-gold-foreground">
          <IndianRupee className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          {donation.member && memberHref ? (
            <Link to={memberHref} className="truncate font-medium hover:underline">
              {donation.member.member_name}
            </Link>
          ) : donation.donor_name ? (
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-medium">{donation.donor_name}</span>
              <AnonymousDonationBadge />
            </p>
          ) : (
            <AnonymousDonationBadge />
          )}
          <p className="text-xs text-muted-foreground">
            {donation.member?.father_name ? `${donation.member.father_name} · ` : ''}
            {formatDate(donation.donation_date)} · {DONATION_TYPE_LABELS[donation.donation_type]} ·{' '}
            {PAYMENT_LABELS[donation.payment_method]}
            {donation.transaction_reference ? ` · Ref: ${donation.transaction_reference}` : ''}
          </p>
        </div>
        <span className="shrink-0 font-display font-semibold tabular-nums">{formatINR(donation.amount_inr)}</span>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
