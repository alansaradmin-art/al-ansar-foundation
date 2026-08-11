import { apiClient, type GetToken } from '@/lib/apiClient'

export interface MemberPeriodSummary {
  donationTotal: number
  donationCount: number
  hasCompletedFollowup: boolean
  /** The real "needs a follow-up" rule (server-computed, IST-aware, and the
   * same source of truth the Pending Follow-ups screen uses) — donation
   * received OR a completed follow-up both clear this regardless of the
   * cutoff day. Never derive "pending" from hasCompletedFollowup alone. */
  isPending: boolean
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
