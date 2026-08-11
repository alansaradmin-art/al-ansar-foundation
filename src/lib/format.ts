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
