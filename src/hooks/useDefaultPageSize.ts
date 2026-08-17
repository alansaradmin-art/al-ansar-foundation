import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { getDefaultPageSize } from '@/services/settings'

/** Shared across every listing page (~9 consumers) — unlike the other
 * settings in this app (each read by 1-2 places, so they're queried
 * inline), this one is common enough to warrant one hook instead of
 * repeating the same useQuery at every call site. Falls back to 10
 * (the seeded default) while loading, so no consumer needs its own
 * fallback literal. */
export function useDefaultPageSize(): { pageSize: number; isLoading: boolean } {
  const { getToken } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.settings.defaultPageSize,
    queryFn: () => getDefaultPageSize(getToken),
  })
  return { pageSize: data ?? 10, isLoading }
}
