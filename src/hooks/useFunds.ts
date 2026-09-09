import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { listFunds, listFundBalances } from '@/services/funds'

export function useFunds(includeInactive = false) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.funds.list(includeInactive),
    queryFn: () => listFunds(getToken, includeInactive),
    staleTime: 5 * 60_000,
  })
}

export function useFundBalances() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.funds.balances,
    queryFn: () => listFundBalances(getToken),
  })
}
