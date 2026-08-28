import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { getReceiptBranding } from '@/services/settings'
import { queryKeys } from '@/lib/queryKeys'

/** Rarely changes — a long staleTime avoids refetching on every receipt
 * open, matching the pattern other rarely-changing settings queries use
 * elsewhere in this app. */
export function useReceiptBranding() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.settings.receiptBranding,
    queryFn: () => getReceiptBranding(getToken),
    staleTime: 5 * 60_000,
  })
}
