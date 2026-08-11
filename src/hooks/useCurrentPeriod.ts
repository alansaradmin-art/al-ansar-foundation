import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { getCurrentPeriod } from '@/services/settings'
import { queryKeys } from '@/lib/queryKeys'
import type { Period } from '@/types'

/**
 * Selected month/year for a screen, defaulting to the database's idea of
 * "now" in IST (never the browser's clock) once it resolves.
 */
export function usePeriodSelector() {
  const { getToken } = useAuth()
  const { data: serverPeriod } = useQuery({
    queryKey: queryKeys.settings.currentPeriod,
    queryFn: () => getCurrentPeriod(getToken),
    staleTime: 5 * 60_000,
  })

  const [period, setPeriod] = useState<Period | null>(null)

  useEffect(() => {
    if (serverPeriod && !period) {
      setPeriod({ month: serverPeriod.month, year: serverPeriod.year })
    }
  }, [serverPeriod, period])

  return {
    period: period ?? (serverPeriod ? { month: serverPeriod.month, year: serverPeriod.year } : null),
    setPeriod,
    isLoading: !serverPeriod,
  }
}
