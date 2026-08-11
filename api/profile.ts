// GET /api/profile — the one endpoint that does NOT use authenticate() from
// api/_lib/auth.ts, because "no profile yet" is a legitimate 200 response
// here (ProfileContext's isUnprovisioned state), not a 403 like everywhere
// else. Every other endpoint requires an already-provisioned, active profile.

import { getOrProvisionProfile, requireAuth } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, sendError, sendJson } from './_lib/http.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed.')
    return
  }

  const clerkUserId = await requireAuth(req, res)
  if (!clerkUserId) return

  try {
    const profile = await getOrProvisionProfile(clerkUserId)
    sendJson(res, 200, { profile })
  } catch (error) {
    console.error('[api/profile] failed to resolve profile', error)
    sendError(res, 500, 'Unable to load your profile. Please try again.')
  }
}
