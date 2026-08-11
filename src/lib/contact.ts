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

/** wa.me requires the number without a leading "+". */
export function whatsappHref(phone: string, message?: string): string {
  const number = digitsOnly(phone).replace(/^\+/, '')
  const query = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${number}${query}`
}
