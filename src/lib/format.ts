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

/** Country calling code -> expected local (subscriber) number length, for
 * every country this foundation's members are known to have numbers from.
 * Local length varies by country (India's mobiles are 10 digits, Saudi
 * Arabia/UAE are 9, Qatar/Kuwait/Bahrain/Oman are 8), so a single fixed
 * "take the last N digits" rule is wrong outside India — it either mangles
 * shorter Gulf numbers or leaves a stray digit from their country code. */
const COUNTRY_CODES: { code: string; localLength: number }[] = [
  { code: '91', localLength: 10 }, // India
  { code: '966', localLength: 9 }, // Saudi Arabia
  { code: '971', localLength: 9 }, // UAE
  { code: '974', localLength: 8 }, // Qatar
  { code: '965', localLength: 8 }, // Kuwait
  { code: '973', localLength: 8 }, // Bahrain
  { code: '968', localLength: 8 }, // Oman
]

/** Strips a leading country code (+91, +966, 00971, ...) from a stored
 * mobile number for display. Only strips when there's real evidence a code
 * is actually present — an explicit "+"/"00" international prefix, or the
 * total digit count exactly matching code+local length for that country —
 * so a bare local number that happens to start with the same digits as a
 * country code (e.g. an Indian "91XXXXXXXX" number) is left alone rather
 * than mis-trimmed. Unrecognized country codes are left as-is; this isn't a
 * full E.164 parser, just coverage for where this foundation's members are.
 * "+919167463126" -> "9167463126", "+966501234567" -> "501234567". Display
 * only — never used for tel:/wa.me links, which need the full number. */
export function formatMobileNumber(phone: string | null | undefined): string {
  if (!phone) return ''
  const trimmed = phone.trim()
  let digits = trimmed.replace(/\D/g, '')
  const hasIntlPrefix = trimmed.startsWith('+') || digits.startsWith('00')
  if (digits.startsWith('00')) digits = digits.slice(2)

  for (const { code, localLength } of COUNTRY_CODES) {
    if (digits.startsWith(code) && (hasIntlPrefix || digits.length === code.length + localLength)) {
      return digits.slice(code.length)
    }
  }
  return digits
}
