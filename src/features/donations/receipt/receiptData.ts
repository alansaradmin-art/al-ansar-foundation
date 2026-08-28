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

export interface ReceiptData {
  receiptNumber: string
  donationDateFormatted: string
  donorName: string
  donorLabel: 'Existing Member' | 'Unknown Donor'
  memberDisplayId: string | null
  donationTypeLabel: string
  amountFormatted: string
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
