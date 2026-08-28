import { formatDate, formatINR } from '@/lib/format'
import type { ReceiptBranding } from '@/services/settings'
import type { Donation, Member } from '@/types'

// Same labels DonationListItem.tsx/DonationHistoryList.tsx already
// duplicate locally — a third local copy, matching that existing
// convention rather than introducing a shared constant unprompted.
const DONATION_TYPE_LABELS: Record<string, string> = {
  ZAKAT: 'Zakat',
  SADAQAH: 'Sadaqah/Sadka',
  FITRA: 'Fitra',
  GENERAL: 'General Donation',
  OTHER: 'Other',
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  ONLINE: 'Online',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
}

/** donations.donation_id (e.g. "D004523") is already a unique, sequential,
 * immutable identifier — see 0005_donation_id_sequence.sql. This only
 * reformats it for display; nothing is ever stored, so the same donation
 * always produces the same receipt number, forever, with no new column. */
export function formatReceiptNumber(donation: Pick<Donation, 'donation_id' | 'donation_year'>): string {
  const seq = donation.donation_id.replace(/\D/g, '').padStart(6, '0')
  return `AF-${donation.donation_year}-${seq}`
}

// The PDF's default font (Helvetica, one of the fixed PDF "standard 14"
// fonts) has no glyph for ₹ (U+20B9) — writing it produced a stray
// substitute mark instead of a rupee sign. "Rs." is plain ASCII, so it's
// safe in any font; formatINR's ₹ symbol stays exactly as-is everywhere
// else (the WhatsApp message text, the rest of the app), since that's
// rendered by the OS/browser's own font, not the PDF's.
const amountGroupFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
export function formatAmountForPdf(amount: number): string {
  return `Rs. ${amountGroupFormatter.format(amount)}`
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n]
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return [TENS[tens], ONES[ones]].filter(Boolean).join(' ')
}

function threeDigitsToWords(n: number): string {
  const hundred = Math.floor(n / 100)
  const rest = n % 100
  return [hundred ? `${ONES[hundred]} Hundred` : '', rest ? twoDigitsToWords(rest) : ''].filter(Boolean).join(' ')
}

/** Indian numbering (crore/lakh/thousand), matching how amounts are
 * already grouped everywhere else in this app (formatINR uses the same
 * 'en-IN' locale) — e.g. 2525 -> "Two Thousand Five Hundred Twenty Five
 * Rupees Only", 125000.50 -> "One Lakh Twenty Five Thousand Rupees and
 * Fifty Paise Only". */
export function amountToWords(amount: number): string {
  const whole = Math.floor(amount)
  const paise = Math.round((amount - whole) * 100)

  let n = whole
  const crore = Math.floor(n / 10000000)
  n %= 10000000
  const lakh = Math.floor(n / 100000)
  n %= 100000
  const thousand = Math.floor(n / 1000)
  n %= 1000
  const hundred = n

  const parts = [
    crore ? `${threeDigitsToWords(crore)} Crore` : '',
    lakh ? `${threeDigitsToWords(lakh)} Lakh` : '',
    thousand ? `${threeDigitsToWords(thousand)} Thousand` : '',
    hundred ? threeDigitsToWords(hundred) : '',
  ].filter(Boolean)

  const rupeesWords = parts.length > 0 ? parts.join(' ') : 'Zero'
  return paise > 0
    ? `${rupeesWords} Rupees and ${twoDigitsToWords(paise)} Paise Only`
    : `${rupeesWords} Rupees Only`
}

export interface ReceiptData {
  receiptNumber: string
  donationDateFormatted: string
  donorName: string
  donorLabel: 'Existing Member' | 'Unknown Donor'
  memberDisplayId: string | null
  donationTypeLabel: string
  /** ₹-symbol formatting — used only in the WhatsApp message text (a
   * browser/OS font renders ₹ fine there). Never used inside the PDF. */
  amountFormatted: string
  /** "Rs. 2,525" — PDF-safe (no ₹ glyph), used inside ReceiptDocument. */
  amountFormattedPdf: string
  /** "Two Thousand Five Hundred Twenty Five Rupees Only" */
  amountInWords: string
  paymentMethodLabel: string
  transactionReference: string | null
  notes: string | null
  recordedByName: string
  logoUrl: string
  bannerUrl: string
  footerText: string
  contactInfo: string
}

/** The one normalizer every receipt-rendering entry point (success screen,
 * admin Donations list, Member 360 Donation History) feeds into both
 * ReceiptDocument (the PDF/preview) and buildWhatsAppReceiptMessage below —
 * so they can never describe the same donation differently. */
export function buildReceiptData(
  donation: Donation,
  member: Pick<Member, 'member_name' | 'member_id'> | null,
  recordedByName: string,
  branding: ReceiptBranding,
): ReceiptData {
  return {
    receiptNumber: formatReceiptNumber(donation),
    donationDateFormatted: formatDate(donation.donation_date),
    donorName: member?.member_name || donation.donor_name || 'Unknown Donor',
    donorLabel: member ? 'Existing Member' : 'Unknown Donor',
    memberDisplayId: member?.member_id ?? null,
    donationTypeLabel: DONATION_TYPE_LABELS[donation.donation_type] ?? donation.donation_type,
    amountFormatted: formatINR(donation.amount_inr),
    amountFormattedPdf: formatAmountForPdf(donation.amount_inr),
    amountInWords: amountToWords(donation.amount_inr),
    paymentMethodLabel: PAYMENT_LABELS[donation.payment_method] ?? donation.payment_method,
    transactionReference: donation.transaction_reference,
    notes: donation.notes,
    recordedByName,
    logoUrl: branding.logoUrl.trim(),
    bannerUrl: branding.bannerUrl.trim(),
    footerText: branding.footerText.trim() || 'Thank you for your valuable contribution to Al Ansar Foundation.',
    contactInfo: branding.contactInfo.trim(),
  }
}

/** The §6 WhatsApp message — every value comes from the actual donation;
 * deliberately never mentions a fixed target/commitment/pending amount. */
export function buildWhatsAppReceiptMessage(data: ReceiptData): string {
  return `Assalamu Alaikum ${data.donorName},

JazakAllahu Khairan for your valuable contribution to Al Ansar Foundation.

Donation Type: ${data.donationTypeLabel}
Amount: ${data.amountFormatted}
Date: ${data.donationDateFormatted}
Receipt No: ${data.receiptNumber}

Please find your donation receipt attached.

May Allah accept your contribution and reward you abundantly. Ameen.`
}
