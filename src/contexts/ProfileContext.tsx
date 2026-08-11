import { createContext, useContext, type ReactNode } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import { queryKeys } from '@/lib/queryKeys'
import type { Profile } from '@/types'

interface ProfileContextValue {
  profile: Profile | null
  isLoading: boolean
  /** true once we've checked (the API self-provisions on first sign-in) and
   * there's still no linked profile — the signed-in email doesn't match the
   * Foundation Admin email or any manager's email in the system. */
  isUnprovisioned: boolean
  /** true if the profile lookup itself failed (bad server config, network
   * error, ...). Kept distinct from isUnprovisioned so a real failure is
   * never shown as "just sign in with the right email" — those need very
   * different fixes. */
  isError: boolean
  error: unknown
  isAdmin: boolean
  isManager: boolean
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded: isUserLoaded } = useUser()
  const { getToken } = useAuth()

  const {
    data: profile,
    isLoading: isQueryLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.profile.current(user?.id),
    queryFn: async () => {
      const { profile } = await apiClient.get<{ profile: Profile | null }>('/api/profile', getToken)
      return profile
    },
    enabled: isUserLoaded && !!user,
    staleTime: 60_000,
  })

  const isLoading = !isUserLoaded || (!!user && isQueryLoading)
  const resolvedProfile = profile && profile.is_active ? profile : null

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
