import { formatDate, formatINR } from '@/lib/format'
import type { Donation } from '@/types'

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

/** The existing-record summary shown inside DuplicateConfirmDialog for a
 * possible-duplicate donation — shared by every donation create/edit
 * dialog that can hit the soft duplicate check. */
export function DonationDuplicateSummary({ donation }: { donation: Donation }) {
  return (
    <>
      <p className="font-medium">
        {formatINR(donation.amount_inr)} · {DONATION_TYPE_LABELS[donation.donation_type]}
      </p>
      <p className="text-muted-foreground">
        {formatDate(donation.donation_date)} · {PAYMENT_LABELS[donation.payment_method]}
        {donation.transaction_reference ? ` · Ref: ${donation.transaction_reference}` : ''}
      </p>
    </>
  )
}
