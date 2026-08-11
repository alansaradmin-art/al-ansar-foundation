import type { AppSupabaseClient } from '@/lib/supabase'
import type { Manager, ManagerStatus } from '@/types'
import type { ManagerFormValues } from '@/schemas/manager.schema'

export async function listManagers(
  client: AppSupabaseClient,
  params: { status?: ManagerStatus; search?: string } = {},
): Promise<Manager[]> {
  let query = client.from('managers').select('*').order('full_name')
  if (params.status) query = query.eq('status', params.status)
  if (params.search?.trim()) {
    const q = params.search.trim()
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
  }
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getManagerById(client: AppSupabaseClient, id: string): Promise<Manager | null> {
  const { data, error } = await client.from('managers').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createManager(client: AppSupabaseClient, values: ManagerFormValues): Promise<Manager> {
  const { data, error } = await client.from('managers').insert(values).select('*').single()
  if (error) throw error
  return data
}

export async function updateManager(
  client: AppSupabaseClient,
  id: string,
  values: ManagerFormValues,
): Promise<Manager> {
  const { data, error } = await client.from('managers').update(values).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function setManagerStatus(
  client: AppSupabaseClient,
  id: string,
  status: ManagerStatus,
): Promise<void> {
  const { error } = await client.from('managers').update({ status }).eq('id', id)
  if (error) throw error
}
