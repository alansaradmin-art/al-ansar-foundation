import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { listPaymentMethods } from '@/services/paymentMethods'

export function usePaymentMethods(includeInactive = false) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.paymentMethods.list(includeInactive),
    queryFn: () => listPaymentMethods(getToken, includeInactive),
    staleTime: 5 * 60_000,
  })
}
