import type { AppSupabaseClient } from '@/lib/supabase'
import type { Member, MemberStatus, PaginatedResult } from '@/types'
import type { MemberFormValues } from '@/schemas/member.schema'

export interface ListMembersParams {
  managerId?: string
  search?: string
  status?: MemberStatus
  page?: number
  pageSize?: number
}

export async function listMembers(
  client: AppSupabaseClient,
  params: ListMembersParams = {},
): Promise<PaginatedResult<Member>> {
  const { managerId, search, status, page = 1, pageSize = 20 } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client.from('members').select('*', { count: 'exact' }).order('member_name')

  if (managerId) query = query.eq('assigned_manager_id', managerId)
  if (status) query = query.eq('status', status)
  if (search?.trim()) {
    const q = search.trim()
    query = query.or(
      `member_name.ilike.%${q}%,member_id.ilike.%${q}%,mobile_number.ilike.%${q}%,father_name.ilike.%${q}%`,
    )
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { rows: data ?? [], count: count ?? 0 }
}

export async function getMemberById(client: AppSupabaseClient, id: string): Promise<Member | null> {
  const { data, error } = await client.from('members').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function searchMembersForPicker(client: AppSupabaseClient, query: string, limit = 10) {
  const q = query.trim()
  let request = client
    .from('members')
    .select('id, member_id, member_name, mobile_number')
    .eq('status', 'ACTIVE')
    .order('member_name')
    .limit(limit)

  if (q) {
    request = request.or(`member_name.ilike.%${q}%,member_id.ilike.%${q}%,mobile_number.ilike.%${q}%`)
  }

  const { data, error } = await request
  if (error) throw error
  return data ?? []
}

export async function createMember(client: AppSupabaseClient, values: MemberFormValues): Promise<Member> {
  const { data, error } = await client
    .from('members')
    .insert(toMemberRow(values))
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateMember(
  client: AppSupabaseClient,
  id: string,
  values: MemberFormValues,
): Promise<Member> {
  const { data, error } = await client
    .from('members')
    .update(toMemberRow(values))
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function setMemberStatus(
  client: AppSupabaseClient,
  id: string,
  status: MemberStatus,
): Promise<void> {
  const { error } = await client.from('members').update({ status }).eq('id', id)
  if (error) throw error
}

export async function reassignManager(
  client: AppSupabaseClient,
  memberIds: string[],
  managerId: string,
): Promise<void> {
  const { error } = await client
    .from('members')
    .update({ assigned_manager_id: managerId })
    .in('id', memberIds)
  if (error) throw error
}

export async function countMembersForManager(client: AppSupabaseClient, managerId: string): Promise<number> {
  const { count, error } = await client
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_manager_id', managerId)
    .eq('status', 'ACTIVE')
  if (error) throw error
  return count ?? 0
}

function toMemberRow(values: MemberFormValues) {
  return {
    member_name: values.member_name,
    father_name: values.father_name || null,
    mobile_number: values.mobile_number || null,
    address: values.address || null,
    added_by_type: values.added_by_type ?? null,
    added_by_id: values.added_by_type === 'REGISTERED_MEMBER' ? values.added_by_id ?? null : null,
    added_by_name: values.added_by_name || null,
    added_by_phone: values.added_by_phone || null,
    reference_contact_type: values.reference_contact_type ?? null,
    reference_contact_id:
      values.reference_contact_type === 'REGISTERED_MEMBER' ? values.reference_contact_id ?? null : null,
    reference_contact_name: values.reference_contact_name || null,
    reference_contact_phone: values.reference_contact_phone || null,
    reference_contact_relationship: values.reference_contact_relationship || null,
    assigned_manager_id: values.assigned_manager_id ?? null,
    status: values.status,
  }
}
