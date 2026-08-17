import { apiClient, type GetToken } from '@/lib/apiClient'
import type { Period } from '@/types'

export async function getCurrentPeriod(getToken: GetToken): Promise<Period & { day: number }> {
  return apiClient.get('/api/settings', getToken, { action: 'currentPeriod' })
}

export async function getFollowUpPendingDay(getToken: GetToken): Promise<number> {
  const { day } = await apiClient.get<{ day: number }>('/api/settings', getToken, { action: 'pendingDay' })
  return day
}

export async function setFollowUpPendingDay(getToken: GetToken, day: number, updatedBy: string): Promise<void> {
  // updatedBy is accepted for call-site compatibility but the server always
  // forces updated_by to the caller's own profile id — see api/settings.ts.
  void updatedBy
  await apiClient.put('/api/settings', getToken, { day }, { action: 'pendingDay' })
}

export async function getNonDonorThreshold(getToken: GetToken): Promise<number> {
  const { percent } = await apiClient.get<{ percent: number }>('/api/settings', getToken, {
    action: 'nonDonorThreshold',
  })
  return percent
}

export async function setNonDonorThreshold(getToken: GetToken, percent: number): Promise<void> {
  await apiClient.put('/api/settings', getToken, { percent }, { action: 'nonDonorThreshold' })
}

export async function getDefaultPageSize(getToken: GetToken): Promise<number> {
  const { pageSize } = await apiClient.get<{ pageSize: number }>('/api/settings', getToken, { action: 'pageSize' })
  return pageSize
}

export async function setDefaultPageSize(getToken: GetToken, pageSize: number): Promise<void> {
  await apiClient.put('/api/settings', getToken, { pageSize }, { action: 'pageSize' })
}
