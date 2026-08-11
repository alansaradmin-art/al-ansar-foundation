// GET /api/profile — the one endpoint that does NOT use authenticate() from
// api/_lib/auth.ts, because "no profile yet" is a legitimate 200 response
// here (ProfileContext's isUnprovisioned state), not a 403 like everywhere
// else. Every other endpoint requires an already-provisioned, active profile.

import { type ApiRequest, type ApiResponse, sendError, sendJson } from './_lib/http'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed.')
    return
  }

  // Dynamically imported (rather than a static top-level import) so that if
  // this module — or one of its dependencies, e.g. @clerk/backend — fails to
  // load, the failure is catchable here and returned as diagnosable JSON
  // instead of a static import failure taking down the whole function before
  // this handler is even registered, which Vercel reports as an opaque
  // "FUNCTION_INVOCATION_FAILED" platform error with no detail at all.
  let auth: typeof import('./_lib/auth')
  try {
    auth = await import('./_lib/auth')
  } catch (error) {
    console.error('[api/profile] failed to load ./_lib/auth', error)
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    sendError(res, 500, 'Server module failed to load.', 'MODULE_LOAD_FAILED', message)
    return
  }

  const clerkUserId = await auth.requireAuth(req, res)
  if (!clerkUserId) return

  try {
    const profile = await auth.getOrProvisionProfile(clerkUserId)
    sendJson(res, 200, { profile })
  } catch (error) {
    console.error('[api/profile] failed to resolve profile', error)
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    sendError(res, 500, 'Unable to load your profile. Please try again.', 'PROFILE_RESOLVE_FAILED', message)
  }
}
