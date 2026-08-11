import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClerkClient, verifyToken } from '@clerk/backend'
import type { Database } from '../../src/types/database'
import { type ApiRequest, type ApiResponse, firstValue, sendError } from './http.js'

// No default export — Vercel only turns a file into a route when it
// default-exports a handler, so this file is never treated as an endpoint.

let cachedSupabase: SupabaseClient<Database> | null = null

/** Service-role client — bypasses RLS entirely by design. This is now the
 * ONLY thing that talks to Supabase; the browser never does (see
 * README/DEPLOYMENT.md — Supabase Third-Party Auth with Clerk has been
 * removed). Authorization is enforced here, in TypeScript, not in Postgres. */
export function getServiceRoleClient(): SupabaseClient<Database> {
  if (cachedSupabase) return cachedSupabase
  const url = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    const missing = [!url && 'VITE_SUPABASE_URL', !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean).join(', ')
    throw new Error(
      `Server misconfigured: ${missing} missing from this deployment's environment variables. Set it in Vercel → Settings → Environment Variables (attached to the environment you're testing) and redeploy.`,
    )
  }
  cachedSupabase = createClient<Database>(url, serviceRoleKey)
  return cachedSupabase
}

let cachedClerkClient: ReturnType<typeof createClerkClient> | null = null

function getClerkClient() {
  if (cachedClerkClient) return cachedClerkClient
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) throw new Error('Server misconfigured: CLERK_SECRET_KEY missing.')
  cachedClerkClient = createClerkClient({ secretKey })
  return cachedClerkClient
}

/** Verifies the caller's Clerk session token (Authorization: Bearer <token>,
 * sourced client-side from Clerk's own getToken() — see src/lib/apiClient.ts).
 * Sends 401 itself and returns null on any failure, so every call site is:
 *   const clerkUserId = await requireAuth(req, res); if (!clerkUserId) return
 */
export async function requireAuth(req: ApiRequest, res: ApiResponse): Promise<string | null> {
  const header = firstValue(req.headers.authorization) ?? firstValue(req.headers.Authorization)
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined
  if (!token) {
    sendError(res, 401, 'Not signed in.')
    return null
  }

  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    sendError(res, 500, 'Server misconfigured.')
    return null
  }

  try {
    const payload = await verifyToken(token, { secretKey })
    return payload.sub
  } catch {
    sendError(res, 401, 'Your session has expired. Please sign in again.')
    return null
  }
}

export interface CallerProfile {
  id: string
  role: 'ADMIN' | 'MANAGER'
  managerId: string | null
  isActive: boolean
  email: string
  fullName: string
}

function toCallerProfile(row: Database['public']['Tables']['profiles']['Row']): CallerProfile {
  return {
    id: row.id,
    role: row.role,
    managerId: row.manager_id,
    isActive: row.is_active,
    email: row.email,
    fullName: row.full_name,
  }
}

/** Finds the caller's profile, self-provisioning it on first sign-in —
 * the service-role replacement for the old provision_my_profile() RPC /
 * ProfileContext client-side logic (both removed, see
 * supabase/migrations/0012_drop_provision_my_profile.sql). The verified
 * email/name come from Clerk's Backend API, NEVER from anything the client
 * sent — a request body can't be trusted to say who it belongs to. */
export async function getOrProvisionProfile(clerkUserId: string): Promise<CallerProfile | null> {
  const supabase = getServiceRoleClient()

  const { data: existing, error: lookupError } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (existing) return toCallerProfile(existing)

  const clerkUser = await getClerkClient().users.getUser(clerkUserId)
  const email = clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase().trim()
  if (!email) {
    console.error('[getOrProvisionProfile] no primaryEmailAddress on Clerk user', {
      clerkUserId,
      emailAddresses: clerkUser.emailAddresses?.map((e) => ({ id: e.id, email: e.emailAddress })),
      primaryEmailAddressId: (clerkUser as unknown as { primaryEmailAddressId?: string | null }).primaryEmailAddressId,
    })
    return null
  }
  const fullName = clerkUser.fullName?.trim() || ''

  const { data: adminEmailSetting, error: settingsError } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'FOUNDATION_ADMIN_EMAIL')
    .maybeSingle()
  if (settingsError) throw settingsError
  const adminEmail = typeof adminEmailSetting?.value === 'string' ? adminEmailSetting.value.toLowerCase().trim() : ''
  console.error('[getOrProvisionProfile] comparing', { email, adminEmail, rawAdminSetting: adminEmailSetting })

  if (email === adminEmail) {
    const { data: provisioned, error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          clerk_user_id: clerkUserId,
          email,
          full_name: fullName || 'Al Ansar Foundation Admin',
          role: 'ADMIN',
          manager_id: null,
          is_active: true,
        },
        { onConflict: 'email' },
      )
      .select('*')
      .single()
    if (upsertError) throw upsertError
    return toCallerProfile(provisioned)
  }

  const { data: manager, error: managerLookupError } = await supabase
    .from('managers')
    .select('id, full_name, status')
    .ilike('email', email)
    .maybeSingle()
  if (managerLookupError) throw managerLookupError

  if (manager) {
    const { data: provisioned, error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          clerk_user_id: clerkUserId,
          email,
          full_name: fullName || manager.full_name,
          role: 'MANAGER',
          manager_id: manager.id,
          is_active: manager.status === 'ACTIVE',
        },
        { onConflict: 'email' },
      )
      .select('*')
      .single()
    if (upsertError) throw upsertError
    return toCallerProfile(provisioned)
  }

  // No match: leave unprovisioned. Admin needs to add/correct this email in
  // the managers table (or the FOUNDATION_ADMIN_EMAIL setting).
  console.error('[getOrProvisionProfile] no admin or manager match, leaving unprovisioned', { email, adminEmail })
  return null
}

function requireActiveProfile(res: ApiResponse, profile: CallerProfile | null): profile is CallerProfile {
  if (!profile) {
    sendError(res, 403, 'Your account is not linked to a profile yet. Contact the Foundation Admin.')
    return false
  }
  if (!profile.isActive) {
    sendError(res, 403, 'Your account has been deactivated. Contact the Foundation Admin.')
    return false
  }
  return true
}

/** The composed guard every resource endpoint calls first, except
 * api/profile.ts (which must return the unprovisioned state as a normal 200,
 * not a 403). Sends the appropriate 401/403 itself and returns null on any
 * failure. */
export async function authenticate(req: ApiRequest, res: ApiResponse): Promise<CallerProfile | null> {
  const clerkUserId = await requireAuth(req, res)
  if (!clerkUserId) return null
  const profile = await getOrProvisionProfile(clerkUserId)
  if (!requireActiveProfile(res, profile)) return null
  return profile
}

export function requireAdmin(res: ApiResponse, profile: CallerProfile): boolean {
  if (profile.role !== 'ADMIN') {
    sendError(res, 403, 'Admins only.')
    return false
  }
  return true
}

/** For the one write that's manager-only rather than admin-only (recording
 * a follow-up) — see api/followups.ts for why. */
export function sendForbiddenUnlessManager(res: ApiResponse, profile: CallerProfile): boolean {
  if (profile.role !== 'MANAGER') {
    sendError(res, 403, 'Managers only.')
    return false
  }
  return true
}

/** For MANAGER, always returns the caller's own manager_id regardless of
 * what was requested — a manager can never widen their own scope by
 * supplying a different managerId. For ADMIN, passes the requested value
 * through unchanged (undefined = "all managers"). */
export function resolveManagerScope(profile: CallerProfile, requestedManagerId?: string): string | undefined {
  if (profile.role === 'MANAGER') return profile.managerId ?? undefined
  return requestedManagerId
}
