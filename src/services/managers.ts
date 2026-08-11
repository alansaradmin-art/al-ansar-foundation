import { apiClient, ApiError, type GetToken } from '@/lib/apiClient'
import type { Manager, ManagerStatus } from '@/types'
import type { ManagerFormValues } from '@/schemas/manager.schema'

export async function listManagers(
  getToken: GetToken,
  params: { status?: ManagerStatus; search?: string } = {},
): Promise<Manager[]> {
  const { rows } = await apiClient.get<{ rows: Manager[] }>('/api/managers', getToken, { ...params })
  return rows
}

export async function getManagerById(getToken: GetToken, id: string): Promise<Manager | null> {
  try {
    return await apiClient.get<Manager>('/api/managers', getToken, { id })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function createManager(getToken: GetToken, values: ManagerFormValues): Promise<Manager> {
  return apiClient.post('/api/managers', getToken, values)
}

export async function updateManager(getToken: GetToken, id: string, values: ManagerFormValues): Promise<Manager> {
  return apiClient.put('/api/managers', getToken, values, { id })
}

export async function setManagerStatus(getToken: GetToken, id: string, status: ManagerStatus): Promise<void> {
  await apiClient.patch('/api/managers', getToken, { status }, { id, action: 'status' })
}
