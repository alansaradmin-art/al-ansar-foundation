// No default export — Vercel only turns a file into a route when it
// default-exports a handler, so this file is never treated as an endpoint.

// Kept in sync by hand with src/lib/format.ts's normalizeMobileNumber() —
// api/*.ts has no established precedent for importing a runtime function
// (as opposed to an `import type`, erased at compile time) from src/lib,
// so this is a deliberate, small duplication rather than a new, unverified
// cross-boundary pattern. See src/lib/format.ts for the full rationale and
// the country-code table this mirrors.
const COUNTRY_CODES: { code: string; localLength: number }[] = [
  { code: '91', localLength: 10 }, // India
  { code: '966', localLength: 9 }, // Saudi Arabia
  { code: '971', localLength: 9 }, // UAE
  { code: '974', localLength: 8 }, // Qatar
  { code: '965', localLength: 8 }, // Kuwait
  { code: '973', localLength: 8 }, // Bahrain
  { code: '968', localLength: 8 }, // Oman
]

/** The canonical stored/compared form for members.mobile_number — every
 * insert/update funnels through this (api/members.ts's toMemberRow), so
 * the unique constraint always compares like-for-like regardless of how
 * the number was typed (spaces, +, leading 00, ...). */
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
