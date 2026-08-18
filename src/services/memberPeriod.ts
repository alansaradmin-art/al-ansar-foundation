import { apiClient, type GetToken } from '@/lib/apiClient'
import type { FollowUpStatus } from '@/types'

export interface MemberPeriodSummary {
  donationTotal: number
  donationCount: number
  hasCompletedFollowup: boolean
  /** The real "needs a follow-up" rule (server-computed, IST-aware, and the
   * same source of truth the Pending Follow-ups screen uses) — donation
   * received OR a completed follow-up both clear this regardless of the
   * cutoff day. Never derive "pending" from hasCompletedFollowup alone. */
  isPending: boolean
  /** The most recently logged follow-up attempt this period, regardless of
   * status — so a STARTED/IN_PROGRESS/etc. attempt (and its notes) shows up
   * on the member list immediately, not just once it's COMPLETED. */
  latestFollowupStatus: FollowUpStatus | null
  latestFollowupDate: string | null
  latestFollowupNotes: string | null
}

/**
 * Current-period donation total + follow-up status for a bounded set of
 * members (one page of a list, never the whole table) — used by member
 * cards so a manager can see "did this member donate / get followed up
 * with this month" without opening each one.
 */
export async function getMemberPeriodSummaries(
  getToken: GetToken,
  memberIds: string[],
  month: number,
  year: number,
): Promise<Record<string, MemberPeriodSummary>> {
  if (memberIds.length === 0) return {}
  return apiClient.post('/api/members', getToken, { memberIds, month, year }, { action: 'periodSummaries' })
}
