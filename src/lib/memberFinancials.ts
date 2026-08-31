import type { Donation } from '@/types'

/** Every figure here is computed from a member's full, already-fetched
 * donation history (useMemberDonations — unpaginated, is_deleted excluded
 * server-side) rather than a new SQL function/endpoint: for a single
 * member that list is small, so there's nothing to gain from moving this
 * to the database. Deliberately descriptive only — no fixed donation
 * target/commitment is assumed or computed anywhere here. */
export interface MemberFinancialSummary {
  totalContribution: number
  currentYearContribution: number
  currentMonthContribution: number
  donationCount: number
  lastDonationDate: string | null
  /** Count of donation records (not distinct months) whose month falls in
   * the trailing 12 months including the current one — the same
   * donations[] used for donationCount above, just recency-filtered. Two
   * donations recorded in the same month both count here, matching
   * "Total Donations" counting them as two separate records rather than
   * collapsing to "1 active month" — that distinct-months version undercounted
   * relative to Total Donations for exactly that case and read as a bug. */
  donationsLast12Months: number
}

export function computeFinancialSummary(donations: Donation[]): MemberFinancialSummary {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  // Trailing 12 months including the current one.
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  let totalContribution = 0
  let currentYearContribution = 0
  let currentMonthContribution = 0
  let donationsLast12Months = 0

  for (const d of donations) {
    const amount = Number(d.amount_inr)
    totalContribution += amount
    if (d.donation_year === currentYear) currentYearContribution += amount
    if (d.donation_year === currentYear && d.donation_month === currentMonth) currentMonthContribution += amount

    const donationMonthStart = new Date(d.donation_year, d.donation_month - 1, 1)
    if (donationMonthStart >= cutoff) donationsLast12Months++
  }

  return {
    totalContribution,
    currentYearContribution,
    currentMonthContribution,
    donationCount: donations.length,
    // donations is sorted donation_date desc by every caller (see
    // api/donations.ts's ?action=forMember), so the first row is the latest.
    lastDonationDate: donations[0]?.donation_date ?? null,
    donationsLast12Months,
  }
}

/** A plain descriptive classification, never a target/commitment — the
 * spec explicitly rules out assuming any fixed donation goal. Thresholds
 * are unchanged from before (still 9/4/1) — donationsLast12Months has no
 * hard ceiling the way a distinct-month count did (a donor giving more
 * than once some months can now exceed 12), but the same cutoffs still
 * read sensibly as "gives often / sometimes / rarely" against a raw count. */
export function frequencyLabel(donationsLast12Months: number): string {
  if (donationsLast12Months >= 9) return 'Regular'
  if (donationsLast12Months >= 4) return 'Occasional'
  if (donationsLast12Months >= 1) return 'Rare'
  return 'No Recent Donations'
}

export interface MonthlyTrendPoint {
  year: number
  month: number
  total: number
}

/** Trailing `months` months (oldest first), including months with zero
 * donations, so the trend chart always has a full, even axis. */
export function computeMonthlyTrend(donations: Donation[], months = 12): MonthlyTrendPoint[] {
  const now = new Date()
  const totals = new Map<string, number>()
  for (const d of donations) {
    const key = `${d.donation_year}-${d.donation_month}`
    totals.set(key, (totals.get(key) ?? 0) + Number(d.amount_inr))
  }

  const points: MonthlyTrendPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    points.push({ year, month, total: totals.get(`${year}-${month}`) ?? 0 })
  }
  return points
}
