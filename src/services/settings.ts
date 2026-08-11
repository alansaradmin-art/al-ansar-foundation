import type { AppSupabaseClient } from '@/lib/supabase'
import type { Period } from '@/types'

export async function getCurrentPeriod(client: AppSupabaseClient): Promise<Period & { day: number }> {
  const { data, error } = await client.rpc('get_current_period').single()
  if (error) throw error
  return data
}

export async function getFollowUpPendingDay(client: AppSupabaseClient): Promise<number> {
  const { data, error } = await client
    .from('app_settings')
    .select('value')
    .eq('key', 'FOLLOW_UP_PENDING_DAY')
    .single()
  if (error) throw error
  return Number(data.value)
}

export async function setFollowUpPendingDay(
  client: AppSupabaseClient,
  day: number,
  updatedBy: string,
): Promise<void> {
  const { error } = await client
    .from('app_settings')
    .update({ value: day, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq('key', 'FOLLOW_UP_PENDING_DAY')
  if (error) throw error
}
