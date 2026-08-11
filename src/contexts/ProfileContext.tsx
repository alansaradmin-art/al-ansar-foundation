import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSupabaseClient } from './SupabaseContext'
import { provisionMyProfile } from '@/services/profiles'
import { queryKeys } from '@/lib/queryKeys'
import type { Profile } from '@/types'

interface ProfileContextValue {
  profile: Profile | null
  isLoading: boolean
  /** true once we've checked (and tried self-provisioning) and there's
   * still no linked profile — the signed-in email doesn't match the
   * Foundation Admin email or any manager's email in the system. */
  isUnprovisioned: boolean
  /** true if the profile lookup itself failed (bad Supabase config, missing
   * tables, RLS misconfigured, network error, ...). Kept distinct from
   * isUnprovisioned so a real failure is never shown as "just sign in with
   * the right email" — those need very different fixes. */
  isError: boolean
  error: unknown
  isAdmin: boolean
  isManager: boolean
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded: isUserLoaded } = useUser()
  const supabase = useSupabaseClient()
  const queryClient = useQueryClient()
  const attemptedForUserId = useRef<string | null>(null)

  const {
    data: profile,
    isLoading: isQueryLoading,
    isError: isQueryError,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.profile.current(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('clerk_user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: isUserLoaded && !!user,
    staleTime: 60_000,
  })

  // No profiles row yet for this signed-in user — self-provision instead of
  // relying on the Clerk webhook, which needs a public URL Clerk can reach
  // and therefore doesn't work against localhost. See
  // supabase/migrations/0007_self_provisioning.sql for the matching rules.
  const provisionMutation = useMutation({
    mutationFn: (vars: { email: string; fullName: string }) =>
      provisionMyProfile(supabase, vars.email, vars.fullName),
    onSuccess: (provisioned) => {
      if (provisioned) {
        queryClient.setQueryData(queryKeys.profile.current(user?.id), provisioned)
      }
    },
  })

  useEffect(() => {
    if (!isUserLoaded || !user || isQueryLoading || isQueryError || profile) return
    if (attemptedForUserId.current === user.id) return
    const email = user.primaryEmailAddress?.emailAddress
    if (!email) return

    attemptedForUserId.current = user.id
    provisionMutation.mutate({ email, fullName: user.fullName ?? '' })
    // provisionMutation intentionally excluded — its identity changes every
    // render, and the attemptedForUserId guard already prevents re-firing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserLoaded, user, isQueryLoading, isQueryError, profile])

  const isAttemptingProvision = attemptedForUserId.current === user?.id && provisionMutation.isPending
  const isLoading = !isUserLoaded || (!!user && (isQueryLoading || isAttemptingProvision))
  const resolvedProfile = profile && profile.is_active ? profile : null

  // A failed provisioning attempt (RPC error — not "no match found", which
  // resolves successfully with null) is a real bug, not a legitimate
  // unprovisioned state. Surface it as an error rather than falling through
  // to "check with your Admin", which would hide what actually broke.
  const isError = isQueryError || provisionMutation.isError
  const error = queryError ?? provisionMutation.error

  const value: ProfileContextValue = {
    profile: resolvedProfile,
    isLoading,
    isUnprovisioned: isUserLoaded && !!user && !isLoading && !isError && !profile,
    isError,
    error,
    isAdmin: resolvedProfile?.role === 'ADMIN',
    isManager: resolvedProfile?.role === 'MANAGER',
  }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return ctx
}
