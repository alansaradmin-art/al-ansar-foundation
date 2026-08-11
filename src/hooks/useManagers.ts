import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSupabaseClient } from '@/contexts/SupabaseContext'
import { queryKeys } from '@/lib/queryKeys'
import * as managersService from '@/services/managers'
import type { ManagerStatus } from '@/types'
import type { ManagerFormValues } from '@/schemas/manager.schema'

export function useManagers(params: { status?: ManagerStatus; search?: string } = {}) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.managers.list(params),
    queryFn: () => managersService.listManagers(client, params),
  })
}

export function useManager(id: string | undefined) {
  const client = useSupabaseClient()
  return useQuery({
    queryKey: queryKeys.managers.detail(id ?? ''),
    queryFn: () => managersService.getManagerById(client, id!),
    enabled: !!id,
  })
}

export function useCreateManager() {
  const client = useSupabaseClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ManagerFormValues) => managersService.createManager(client, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['managers'] }),
  })
}

export function useUpdateManager(id: string) {
  const client = useSupabaseClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ManagerFormValues) => managersService.updateManager(client, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.managers.detail(id) })
    },
  })
}

export function useSetManagerStatus() {
  const client = useSupabaseClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ManagerStatus }) =>
      managersService.setManagerStatus(client, id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['managers'] }),
  })
}
