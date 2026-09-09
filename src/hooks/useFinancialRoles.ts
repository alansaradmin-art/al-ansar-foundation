import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { listActiveFinancialRoleGrants, grantFinancialRole, revokeFinancialRole } from '@/services/profileFinancialRoles'
import type { FinancialRoleCode } from '@/types'

export function useActiveFinancialRoleGrants() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.financialRoles.active,
    queryFn: () => listActiveFinancialRoleGrants(getToken),
  })
}

export function useGrantFinancialRole() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, roleCode }: { profileId: string; roleCode: FinancialRoleCode }) =>
      grantFinancialRole(getToken, profileId, roleCode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-roles'] }),
  })
}

export function useRevokeFinancialRole() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => revokeFinancialRole(getToken, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial-roles'] }),
  })
}
