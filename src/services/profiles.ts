import type { AppSupabaseClient } from '@/lib/supabase'
import type { Profile } from '@/types'

/**
 * Self-service equivalent of the Clerk webhook: matches the caller's own
 * email against the configured Admin email / the managers table and
 * creates their profiles row if a match is found. Safe to call whenever no
 * profile exists yet — it only ever provisions the calling user themselves.
 */
export async function provisionMyProfile(
  client: AppSupabaseClient,
  email: string,
  fullName: string,
): Promise<Profile | null> {
  const { data, error } = await client.rpc('provision_my_profile', { p_email: email, p_full_name: fullName })
  if (error) throw error
  return data
}
