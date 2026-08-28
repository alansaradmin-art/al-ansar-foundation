import { apiClient, type GetToken } from '@/lib/apiClient'
import type { Donation, DonationType, PaginatedResult, PaymentMethod } from '@/types'
import type { DonationFormValues } from '@/schemas/donation.schema'

/** recorder embed added alongside the plain donation columns — needed for
 * a receipt's "Received/entered by" field wherever this list is the data
 * source (Member 360's Donations tab). See api/donations.ts's forMember. */
export type DonationWithRecorder = Donation & { recorder: { full_name: string } | null }

export async function listDonationsForMember(getToken: GetToken, memberId: string): Promise<DonationWithRecorder[]> {
  const { rows } = await apiClient.get<{ rows: DonationWithRecorder[] }>('/api/donations', getToken, {
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
  member: {
    member_name: string
    member_id: string
    father_name: string | null
    mobile_number: string | null
    mobile_country: string | null
    assigned_manager_id: string | null
  } | null
  recorder: { full_name: string } | null
}

export async function listDonationsAdmin(
  getToken: GetToken,
  filters: AdminDonationFilters = {},
): Promise<PaginatedResult<DonationWithRelations>> {
  return apiClient.get('/api/donations', getToken, { ...filters })
}

export async function updateDonation(getToken: GetToken, id: string, values: DonationFormValues): Promise<Donation> {
  return apiClient.patch('/api/donations', getToken, values, { id, action: 'update' })
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

export type ReceiptEvent = 'generated' | 'viewed' | 'downloaded' | 'shared'

/** Fire-and-forget audit trail entry for a receipt action — callers should
 * never await this in a way that blocks the actual view/download/share it
 * describes; see useDonationReceipt.ts. */
export async function logReceiptEvent(getToken: GetToken, donationId: string, event: ReceiptEvent): Promise<void> {
  await apiClient.post('/api/donations', getToken, { id: donationId, event }, { action: 'logReceiptEvent' })
}
