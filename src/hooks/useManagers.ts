import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as managersService from '@/services/managers'
import type { ManagerStatus } from '@/types'
import type { ManagerFormValues } from '@/schemas/manager.schema'

export function useManagers(params: { status?: ManagerStatus; search?: string } = {}) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.managers.list(params),
    queryFn: () => managersService.listManagers(getToken, params),
  })
}

export function useManager(id: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.managers.detail(id ?? ''),
    queryFn: () => managersService.getManagerById(getToken, id!),
    enabled: !!id,
  })
}

export function useCreateManager() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ManagerFormValues) => managersService.createManager(getToken, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['managers'] }),
  })
}

export function useUpdateManager(id: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ManagerFormValues) => managersService.updateManager(getToken, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.managers.detail(id) })
    },
  })
}

export function useSetManagerStatus() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ManagerStatus }) =>
      managersService.setManagerStatus(getToken, id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['managers'] }),
  })
}
