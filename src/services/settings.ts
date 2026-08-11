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
