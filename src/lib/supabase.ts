import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.',
  )
}

export type AppSupabaseClient = SupabaseClient<Database>

/**
 * Creates a Supabase client bound to the current Clerk session. Supabase
 * validates the Clerk-issued JWT directly (native third-party auth, no
 * manual JWT template) and every RLS policy reads auth.jwt()->>'sub' to
 * resolve the calling profile. This is the ONLY thing that stands between a
 * manager and another manager's data — see supabase/migrations/0003_rls.sql.
 */
export function createSupabaseClient(getToken: () => Promise<string | null>): AppSupabaseClient {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => (await getToken()) ?? null,
  })
}
