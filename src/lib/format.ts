import { buildInternationalNumber, countryFlag, findCountry } from './countries'

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

/** Local-machine "today" as YYYY-MM-DD — used as both a date field's
 * default value and to reject a future date client-side (donation and
 * follow-up forms). The server is always the authoritative check and
 * uses IST explicitly instead, since it can't rely on any particular
 * caller's clock/timezone. */
export function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
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

/** Bytes -> "1.2 MB" — used for uploaded document sizes. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

/** Strips a leading country code (+91, +966, 00971, ...) down to the bare
 * local number. Only strips when there's real evidence a code is actually
 * present — an explicit "+"/"00" international prefix, or the total digit
 * count exactly matching code+local length for that country — so a bare
 * local number that happens to start with the same digits as a country code
 * (e.g. an Indian "91XXXXXXXX" number) is left alone rather than
 * mis-trimmed. Unrecognized country codes are left as-is; this isn't a full
 * E.164 parser, just coverage for where this foundation's members are.
 * "+919167463126" -> "9167463126", "+966501234567" -> "501234567".
 *
 * This is the canonical form used both for display (formatMobileNumber
 * below) and for storage/uniqueness comparison (api/members.ts's
 * toMemberRow, via api/_lib/phone.ts's server-side copy of this same
 * function — keep both in sync). Never used for tel:/wa.me links, which
 * need the full number as entered. */
export function normalizeMobileNumber(phone: string): string {
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

/** Display-only. Shows the flag + dial code when a country is known
 * (post-redesign rows always have one); falls back to the bare
 * country-code-stripped digits for legacy rows with no stored country —
 * same display those rows have always had. */
export function formatMobileNumber(phone: string | null | undefined, country?: string | null): string {
  if (!phone) return ''
  const local = normalizeMobileNumber(phone)
  const known = findCountry(country)
  return known ? `${countryFlag(known.iso2)} +${known.dialCode} ${local}` : local
}

/** LEGACY FALLBACK ONLY — kept for rows with no stored country (see
 * migration 0035_phone_country_split.sql's backfill notes: only a bare
 * 10-digit number could be reliably backfilled to India; genuinely
 * ambiguous Gulf-length numbers were left with no country on purpose).
 * The primary path for every row with a known country is
 * buildInternationalNumber (src/lib/countries.ts) — deterministic, no
 * guessing, since the country was chosen explicitly rather than inferred.
 *
 * This is the inverse of normalizeMobileNumber — wa.me/tel: links need
 * the full international number (country code + local number), but
 * members.mobile_number is always stored with the country code already
 * stripped (see normalizeMobileNumber's own doc comment), so it has to be
 * re-attached here rather than read back from storage.
 *
 * Re-attaching is only unambiguous when the stored number's length matches
 * exactly one country's local length — true for India (10 digits, the only
 * one of that length here) but genuinely ambiguous for Gulf numbers, since
 * Saudi Arabia/UAE share a 9-digit local length and Qatar/Kuwait/Bahrain/Oman
 * share 8. There's no data left after stripping to disambiguate further
 * (the original country code was never stored), so this picks the first
 * match in COUNTRY_CODES' existing priority order — Saudi Arabia over UAE,
 * Qatar over the other three 8-digit countries — the same order
 * normalizeMobileNumber already uses for stripping. Returns null rather
 * than guessing when the length doesn't match any known country at all. */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = normalizeMobileNumber(phone)
  const match = COUNTRY_CODES.find((c) => c.localLength === digits.length)
  return match ? `${match.code}${digits}` : null
}

/** Primary path for building a full international number: deterministic
 * from a known (country, local number) pair, no guessing. Falls back to
 * the legacy length-guess (toWhatsAppNumber) only when no country is
 * stored, so pre-migration rows keep working exactly as before. */
export function resolveInternationalNumber(phone: string | null | undefined, country: string | null | undefined): string | null {
  return buildInternationalNumber(country, phone ? normalizeMobileNumber(phone) : phone) ?? toWhatsAppNumber(phone)
}
