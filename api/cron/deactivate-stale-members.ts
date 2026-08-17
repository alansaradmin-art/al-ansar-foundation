import { getServiceRoleClient } from '../_lib/auth.js'
import { type ApiRequest, type ApiResponse, firstValue, sendError, sendJson } from '../_lib/http.js'
import { logUpdate } from '../_lib/auditLog.js'

// Scheduled by vercel.json's `crons` entry — Vercel invokes this on a
// schedule with no Clerk session, so it can't go through authenticate().
// Instead it trusts Vercel's own documented cron-auth convention: set
// CRON_SECRET in the project's environment variables, and Vercel attaches
// it as `Authorization: Bearer <CRON_SECRET>` on every cron-triggered
// request. Fails closed if the secret isn't configured.
function isAuthorizedCronRequest(req: ApiRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const header = firstValue(req.headers.authorization) ?? firstValue(req.headers.Authorization)
  return header === `Bearer ${expected}`
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!isAuthorizedCronRequest(req)) return sendError(res, 401, 'Unauthorized.')

  const supabase = getServiceRoleClient()

  try {
    const { data: staleRows, error: staleError } = await supabase.rpc('stale_active_member_ids')
    if (staleError) throw staleError
    const staleIds = (staleRows ?? []).map((r) => r.member_id)
    if (staleIds.length === 0) return sendJson(res, 200, { deactivated: 0 })

    const { data: oldRows, error: oldError } = await supabase.from('members').select('*').in('id', staleIds)
    if (oldError) throw oldError

    const { data: newRows, error: updateError } = await supabase
      .from('members')
      .update({ status: 'INACTIVE' })
      .in('id', staleIds)
      .select('*')
    if (updateError) throw updateError

    const oldById = new Map((oldRows ?? []).map((r) => [r.id, r]))
    await Promise.all(
      (newRows ?? []).map((newRow) => {
        const oldRow = oldById.get(newRow.id)
        // actorProfileId: null — this is a system/scheduled change, not a
        // human action; AuditLogEntry.tsx already renders a null actor as
        // "System".
        return oldRow ? logUpdate(supabase, 'members', null, oldRow, newRow) : Promise.resolve()
      }),
    )

    return sendJson(res, 200, { deactivated: newRows?.length ?? 0 })
  } catch (error) {
    console.error('[api/cron/deactivate-stale-members]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
