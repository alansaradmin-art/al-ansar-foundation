import type { AppSupabaseClient } from '@/lib/supabase'
import type { Donation, PaginatedResult, PaymentMethod } from '@/types'
import type { DonationFormValues } from '@/schemas/donation.schema'

export async function listDonationsForMember(client: AppSupabaseClient, memberId: string): Promise<Donation[]> {
  const { data, error } = await client
    .from('donations')
    .select('*')
    .eq('member_id', memberId)
    .eq('is_deleted', false)
    .order('donation_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createDonation(
  client: AppSupabaseClient,
  values: DonationFormValues,
  recordedBy: string,
): Promise<Donation> {
  const [year, month] = values.donation_date.split('-').map(Number)
  const { data, error } = await client
    .from('donations')
    .insert({
      member_id: values.member_id,
      donation_date: values.donation_date,
      donation_month: month,
      donation_year: year,
      amount_inr: values.amount_inr,
      payment_method: values.payment_method,
      transaction_reference: values.transaction_reference || null,
      notes: values.notes || null,
      recorded_by: recordedBy,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export interface AdminDonationFilters {
  month?: number
  year?: number
  managerId?: string
  memberId?: string
  paymentMethod?: PaymentMethod
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export type DonationWithRelations = Donation & {
  member: { member_name: string; member_id: string; assigned_manager_id: string | null } | null
  recorder: { full_name: string } | null
}

export async function listDonationsAdmin(
  client: AppSupabaseClient,
  filters: AdminDonationFilters = {},
): Promise<PaginatedResult<DonationWithRelations>> {
  const { month, year, managerId, memberId, paymentMethod, dateFrom, dateTo, page = 1, pageSize = 25 } = filters
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('donations')
    .select(
      'id, donation_id, member_id, donation_date, donation_month, donation_year, amount_inr, payment_method, transaction_reference, notes, recorded_by, is_deleted, created_at, member:members!inner(member_name, member_id, assigned_manager_id), recorder:profiles!donations_recorded_by_fkey(full_name)',
      { count: 'exact' },
    )
    .eq('is_deleted', false)
    .order('donation_date', { ascending: false })

  if (month) query = query.eq('donation_month', month)
  if (year) query = query.eq('donation_year', year)
  if (memberId) query = query.eq('member_id', memberId)
  if (paymentMethod) query = query.eq('payment_method', paymentMethod)
  if (dateFrom) query = query.gte('donation_date', dateFrom)
  if (dateTo) query = query.lte('donation_date', dateTo)
  if (managerId) query = query.eq('member.assigned_manager_id', managerId)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { rows: (data ?? []) as unknown as DonationWithRelations[], count: count ?? 0 }
}

export async function softDeleteDonation(
  client: AppSupabaseClient,
  id: string,
  deletedBy: string,
  reason: string,
): Promise<void> {
  const { error } = await client
    .from('donations')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: deletedBy, deletion_reason: reason })
    .eq('id', id)
  if (error) throw error
}
