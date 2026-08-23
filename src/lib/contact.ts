import { toWhatsAppNumber } from './format'

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
 * local number). A stored number whose length doesn't unambiguously match
 * a known country can't be reliably turned into one (see
 * toWhatsAppNumber), so this can say "no" even when hasUsablePhone says
 * "yes". */
export function hasUsableWhatsAppNumber(phone: string | null | undefined): boolean {
  return toWhatsAppNumber(phone) !== null
}

/** wa.me requires the full international number, digits only, no leading
 * "+" — see toWhatsAppNumber for how that's reconstructed from the
 * country-code-stripped stored number. Returns null when it can't be
 * reliably resolved; callers should gate on hasUsableWhatsAppNumber first
 * rather than rely on this returning null. */
export function whatsappHref(phone: string, message?: string): string | null {
  const number = toWhatsAppNumber(phone)
  if (!number) return null
  const query = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${number}${query}`
}
