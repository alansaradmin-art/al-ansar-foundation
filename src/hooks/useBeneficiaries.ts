import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { pickBeneficiaries, createBeneficiary } from '@/services/beneficiaries'
import type { BeneficiaryFormValues } from '@/schemas/expense.schema'

export function useBeneficiaryPicker(search: string) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.beneficiaries.picker(search),
    queryFn: () => pickBeneficiaries(getToken, search),
  })
}

export function useCreateBeneficiary() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: BeneficiaryFormValues) => createBeneficiary(getToken, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beneficiaries'] }),
  })
}
