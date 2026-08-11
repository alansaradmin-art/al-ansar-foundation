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
    // getOrProvisionProfile returns CallerProfile — a camelCase shape used
    // internally by the authorization logic throughout api/_lib/auth.ts and
    // every other api/*.ts file. The frontend's Profile type is the raw
    // Postgres row (snake_case: is_active, manager_id, full_name — see
    // src/types/database.ts), since it's used directly everywhere else in
    // the app (member forms, follow-up creation, etc.). Convert at this one
    // wire boundary rather than changing CallerProfile's shape everywhere.
    sendJson(res, 200, {
      profile: profile && {
        id: profile.id,
        role: profile.role,
        manager_id: profile.managerId,
        is_active: profile.isActive,
        email: profile.email,
        full_name: profile.fullName,
      },
    })
  } catch (error) {
    console.error('[api/profile] failed to resolve profile', error)
    sendError(res, 500, 'Unable to load your profile. Please try again.')
  }
}
