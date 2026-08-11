import type { AppSupabaseClient } from '@/lib/supabase'

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
  client: AppSupabaseClient,
  memberIds: string[],
  month: number,
  year: number,
): Promise<Record<string, MemberPeriodSummary>> {
  if (memberIds.length === 0) return {}

  const [
    { data: donations, error: donationsError },
    { data: followups, error: followupsError },
    { data: pendingRows, error: pendingError },
  ] = await Promise.all([
    client
      .from('donations')
      .select('member_id, amount_inr')
      .in('member_id', memberIds)
      .eq('donation_month', month)
      .eq('donation_year', year)
      .eq('is_deleted', false),
    client
      .from('monthly_followups')
      .select('member_id, follow_up_status')
      .in('member_id', memberIds)
      .eq('month', month)
      .eq('year', year),
    client.rpc('is_pending_followup_batch', { p_member_ids: memberIds, p_month: month, p_year: year }),
  ])

  if (donationsError) throw donationsError
  if (followupsError) throw followupsError
  if (pendingError) throw pendingError

  const summaries: Record<string, MemberPeriodSummary> = {}
  for (const id of memberIds) {
    summaries[id] = { donationTotal: 0, donationCount: 0, hasCompletedFollowup: false, isPending: false }
  }
  for (const d of donations ?? []) {
    summaries[d.member_id].donationTotal += Number(d.amount_inr)
    summaries[d.member_id].donationCount += 1
  }
  for (const f of followups ?? []) {
    if (f.follow_up_status === 'COMPLETED') summaries[f.member_id].hasCompletedFollowup = true
  }
  for (const p of pendingRows ?? []) {
    if (summaries[p.member_id]) summaries[p.member_id].isPending = p.is_pending
  }
  return summaries
}
