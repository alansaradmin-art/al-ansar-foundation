import { apiClient, type GetToken } from '@/lib/apiClient'
import type { Donation, DonationType, PaginatedResult, PaymentMethod } from '@/types'
import type { DonationFormValues } from '@/schemas/donation.schema'

export async function listDonationsForMember(getToken: GetToken, memberId: string): Promise<Donation[]> {
  const { rows } = await apiClient.get<{ rows: Donation[] }>('/api/donations', getToken, {
    action: 'forMember',
    memberId,
  })
  return rows
}

export async function createDonation(
  getToken: GetToken,
  values: DonationFormValues,
  recordedBy: string,
): Promise<Donation> {
  // recordedBy is accepted for call-site compatibility but the server
  // always forces recorded_by to the caller's own profile id — see
  // api/donations.ts.
  void recordedBy
  return apiClient.post('/api/donations', getToken, values)
}

export interface AdminDonationFilters {
  month?: number
  year?: number
  managerId?: string
  memberId?: string
  paymentMethod?: PaymentMethod
  donationType?: DonationType
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
  getToken: GetToken,
  filters: AdminDonationFilters = {},
): Promise<PaginatedResult<DonationWithRelations>> {
  return apiClient.get('/api/donations', getToken, { ...filters })
}

export async function softDeleteDonation(
  getToken: GetToken,
  id: string,
  deletedBy: string,
  reason: string,
): Promise<void> {
  // deletedBy is accepted for call-site compatibility but the server always
  // forces deleted_by to the caller's own profile id — see api/donations.ts.
  void deletedBy
  await apiClient.patch('/api/donations', getToken, { reason }, { id, action: 'softDelete' })
}
