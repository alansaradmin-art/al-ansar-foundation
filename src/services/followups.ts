import type { AppSupabaseClient } from '@/lib/supabase'
import type { FollowUpStatus, Member, MonthlyFollowup, PaginatedResult } from '@/types'
import type { FollowupFormValues } from '@/schemas/followup.schema'

export async function listFollowupsForMember(client: AppSupabaseClient, memberId: string): Promise<MonthlyFollowup[]> {
  const { data, error } = await client
    .from('monthly_followups')
    .select('*')
    .eq('member_id', memberId)
    .order('follow_up_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createFollowup(
  client: AppSupabaseClient,
  values: FollowupFormValues,
  managerId: string,
  createdBy: string,
): Promise<MonthlyFollowup> {
  const [year, month] = values.follow_up_date.split('-').map(Number)
  const { data, error } = await client
    .from('monthly_followups')
    .insert({
      member_id: values.member_id,
      manager_id: managerId,
      month,
      year,
      follow_up_date: values.follow_up_date,
      follow_up_status: values.follow_up_status,
      follow_up_method: values.follow_up_method ?? null,
      contacted_person_type: values.contacted_person_type,
      contacted_person_name: values.contacted_person_name || null,
      contacted_person_phone: values.contacted_person_phone || null,
      contacted_person_relationship: values.contacted_person_relationship || null,
      remarks: values.remarks || null,
      created_by: createdBy,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** managerId = undefined -> Admin view across every manager. */
export async function listPendingFollowups(
  client: AppSupabaseClient,
  managerId: string | undefined,
  month: number,
  year: number,
): Promise<Member[]> {
  const { data, error } = await client.rpc('list_pending_followups', {
    p_manager_id: managerId ?? null,
    p_month: month,
    p_year: year,
  })
  if (error) throw error
  return data ?? []
}

export interface AdminFollowupFilters {
  month?: number
  year?: number
  managerId?: string
  status?: FollowUpStatus
  page?: number
  pageSize?: number
}

export type FollowupWithRelations = MonthlyFollowup & {
  member: { member_name: string; member_id: string } | null
  manager: { full_name: string } | null
}

export async function listFollowupsAdmin(
  client: AppSupabaseClient,
  filters: AdminFollowupFilters = {},
): Promise<PaginatedResult<FollowupWithRelations>> {
  const { month, year, managerId, status, page = 1, pageSize = 25 } = filters
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('monthly_followups')
    .select(
      '*, member:members(member_name, member_id), manager:managers(full_name)',
      { count: 'exact' },
    )
    .order('follow_up_date', { ascending: false })

  if (month) query = query.eq('month', month)
  if (year) query = query.eq('year', year)
  if (managerId) query = query.eq('manager_id', managerId)
  if (status) query = query.eq('follow_up_status', status)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { rows: (data ?? []) as unknown as FollowupWithRelations[], count: count ?? 0 }
}
