import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { listExpenseCategories } from '@/services/expenseCategories'

export function useExpenseCategories(includeInactive = false) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.expenseCategories.list(includeInactive),
    queryFn: () => listExpenseCategories(getToken, includeInactive),
    staleTime: 5 * 60_000,
  })
}
