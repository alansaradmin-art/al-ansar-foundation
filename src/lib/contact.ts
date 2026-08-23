import { resolveInternationalNumber } from './format'

/** Keeps a leading "+" (if present) and strips everything else non-numeric. */
function digitsOnly(phone: string): string {
  const trimmed = phone.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

export function hasUsablePhone(phone: string | null | undefined): phone is string {
  return !!phone && digitsOnly(phone).replace('+', '').length >= 8
}

export function telHref(phone: string): string {
  return `tel:${digitsOnly(phone)}`
}

/** Stricter than hasUsablePhone — tel: links work fine with a bare local
 * number, but wa.me needs the full international number (country code +
 * local number). A row with a known country resolves deterministically
 * (resolveInternationalNumber, src/lib/format.ts); a legacy row with no
 * stored country falls back to the old length-guess, which can still fail
 * to resolve — this can say "no" even when hasUsablePhone says "yes". */
export function hasUsableWhatsAppNumber(phone: string | null | undefined, country: string | null | undefined): boolean {
  return resolveInternationalNumber(phone, country) !== null
}

/** wa.me requires the full international number, digits only, no leading
 * "+" — see resolveInternationalNumber for how that's built from the
 * stored (country, local number) pair. Returns null when it can't be
 * resolved; callers should gate on hasUsableWhatsAppNumber first rather
 * than rely on this returning null. */
export function whatsappHref(phone: string, country: string | null | undefined, message?: string): string | null {
  const number = resolveInternationalNumber(phone, country)
  if (!number) return null
  const query = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${number}${query}`
}
