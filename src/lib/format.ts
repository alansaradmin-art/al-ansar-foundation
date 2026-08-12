const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

/** 1000 -> "₹1,000", 125000 -> "₹1,25,000" */
export function formatINR(amount: number): string {
  return inrFormatter.format(amount)
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? ''
}

/** month/year -> "August 2026" */
export function formatPeriod(month: number, year: number): string {
  return `${monthName(month)} ${year}`
}

/** "YYYY-MM-DD" -> "10 Aug 2026" */
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return dateStr
  return `${day} ${monthName(month).slice(0, 3)} ${year}`
}

/** ISO timestamp -> "10 Aug 2026, 3:20 pm" (always Asia/Kolkata, regardless
 * of the viewer's own timezone — every timestamp in this app is IST). */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
}

/** Strips a leading country code (e.g. "+91", "0091") from a stored mobile
 * number for display — Indian mobile numbers are always exactly 10 digits,
 * so anything beyond the last 10 digits is a country/trunk prefix, not part
 * of the number itself. "+919167463126" -> "9167463126". Display only —
 * never used for tel:/wa.me links, which need the full number. */
export function formatMobileNumber(phone: string | null | undefined): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}
