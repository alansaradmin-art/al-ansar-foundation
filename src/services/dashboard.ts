import { apiClient, type GetToken } from '@/lib/apiClient'
import type { DonationType, PaymentMethod } from '@/types'

export interface ManagerDashboardStats {
  total_members: number
  active_members: number
  members_with_donation: number
  donation_amount: number
  donation_count: number
  completed_followups: number
  pending_followups: number
}

export async function getManagerDashboardStats(
  getToken: GetToken,
  managerId: string,
  month: number,
  year: number,
): Promise<ManagerDashboardStats> {
  return apiClient.get('/api/dashboard', getToken, { type: 'manager', managerId, month, year })
}

export interface AdminDashboardStats {
  total_members: number
  active_members: number
  inactive_members: number
  total_managers: number
  total_donations: number
  total_donation_amount: number
  period_donation_amount: number
  period_donation_count: number
  completed_followups: number
  pending_followups: number
}

export async function getAdminDashboardStats(getToken: GetToken, month: number, year: number): Promise<AdminDashboardStats> {
  return apiClient.get('/api/dashboard', getToken, { type: 'admin', month, year })
}

export interface ManagerWiseReportRow {
  manager_id: string
  manager_name: string
  assigned_members: number
  members_with_donation: number
  donation_count: number
  donation_amount: number
  completed_followups: number
  pending_followups: number
}

export async function getManagerWiseReport(
  getToken: GetToken,
  month: number,
  year: number,
  donationType?: DonationType,
): Promise<ManagerWiseReportRow[]> {
  const { rows } = await apiClient.get<{ rows: ManagerWiseReportRow[] }>('/api/dashboard', getToken, {
    type: 'managerWiseReport',
    month,
    year,
    ...(donationType ? { donationType } : {}),
  })
  return rows
}

export interface MonthWiseReportRow {
  month: number
  year: number
  donation_count: number
  donation_amount: number
  completed_followups: number
  pending_followups: number
}

export async function getMonthWiseReport(
  getToken: GetToken,
  year: number,
  donationType?: DonationType,
): Promise<MonthWiseReportRow[]> {
  const { rows } = await apiClient.get<{ rows: MonthWiseReportRow[] }>('/api/dashboard', getToken, {
    type: 'monthWiseReport',
    year,
    ...(donationType ? { donationType } : {}),
  })
  return rows
}

export interface AttentionMember {
  id: string
  member_id: string
  member_name: string
  father_name: string | null
  mobile_number: string | null
  assigned_manager_id: string | null
  manager_name: string | null
  status: 'ACTIVE' | 'INACTIVE'
  updated_at: string
  is_pending_followup: boolean
  is_inactive: boolean
  no_recent_donation: boolean
}

export async function getAttentionMembers(
  getToken: GetToken,
  month: number,
  year: number,
  managerId?: string,
): Promise<AttentionMember[]> {
  const { rows } = await apiClient.get<{ rows: AttentionMember[] }>('/api/dashboard', getToken, {
    type: 'attentionMembers',
    month,
    year,
    ...(managerId ? { managerId } : {}),
  })
  return rows
}

export interface DonationReportRow {
  id: string
  donation_id: string
  donation_date: string
  donation_type: DonationType
  amount_inr: number
  payment_method: PaymentMethod
  transaction_reference: string | null
}

export interface DonationReportMemberGroup {
  memberId: string
  memberName: string
  memberDisplayId: string
  memberFatherName: string | null
  total: number
  donations: DonationReportRow[]
}

export interface MonthlyDonationReport {
  summary: {
    totalCount: number
    totalAmount: number
    zakat: number
    sadaqah: number
    fitra: number
    generalOrOther: number
  }
  members: DonationReportMemberGroup[]
  anonymous: { total: number; donations: DonationReportRow[] }
}

export async function getMonthlyDonationReport(
  getToken: GetToken,
  month: number,
  year: number,
): Promise<MonthlyDonationReport> {
  return apiClient.get('/api/dashboard', getToken, { type: 'monthlyDonationReport', month, year })
}
