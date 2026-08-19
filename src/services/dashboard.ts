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
  zakat_amount: number
  sadaqah_amount: number
  fitra_amount: number
  general_or_other_amount: number
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

export interface DonationEngagementRow {
  memberId: string
  memberName: string
  fatherName: string | null
  mobileNumber: string | null
  memberDisplayId: string
  assignedManagerId: string | null
  managerName: string | null
  donated: boolean
  donationCount: number
  totalAmount: number
  latestDonationDate: string | null
}

export interface DonationEngagementParams {
  dateFrom?: string
  dateTo?: string
  neverDonated?: boolean
}

export async function getDonationEngagementReport(
  getToken: GetToken,
  params: DonationEngagementParams = {},
): Promise<DonationEngagementRow[]> {
  const { rows } = await apiClient.get<{
    rows: {
      member_id: string
      member_name: string
      father_name: string | null
      mobile_number: string | null
      member_display_id: string
      assigned_manager_id: string | null
      manager_name: string | null
      donated: boolean
      donation_count: number
      total_amount: number
      latest_donation_date: string | null
    }[]
  }>('/api/dashboard', getToken, {
    type: 'donationEngagement',
    ...(params.neverDonated ? { neverDonated: 'true' } : {}),
    ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
    ...(params.dateTo ? { dateTo: params.dateTo } : {}),
  })
  return rows.map((r) => ({
    memberId: r.member_id,
    memberName: r.member_name,
    fatherName: r.father_name,
    mobileNumber: r.mobile_number,
    memberDisplayId: r.member_display_id,
    assignedManagerId: r.assigned_manager_id,
    managerName: r.manager_name,
    donated: r.donated,
    donationCount: r.donation_count,
    totalAmount: r.total_amount,
    latestDonationDate: r.latest_donation_date,
  }))
}

export interface ManagerFollowupReportRow {
  managerId: string
  managerName: string
  assignedMembers: number
  pendingCount: number
  startedCount: number
  inProgressCount: number
  completedCount: number
  notInterestedCount: number
  callbackRequiredCount: number
  otherCount: number
  totalFollowups: number
}

export interface ManagerFollowupReportParams {
  dateFrom?: string
  dateTo?: string
}

export async function getManagerFollowupReport(
  getToken: GetToken,
  params: ManagerFollowupReportParams = {},
): Promise<ManagerFollowupReportRow[]> {
  const { rows } = await apiClient.get<{
    rows: {
      manager_id: string
      manager_name: string
      assigned_members: number
      pending_count: number
      started_count: number
      in_progress_count: number
      completed_count: number
      not_interested_count: number
      callback_required_count: number
      other_count: number
      total_followups: number
    }[]
  }>('/api/dashboard', getToken, {
    type: 'managerFollowupReport',
    ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
    ...(params.dateTo ? { dateTo: params.dateTo } : {}),
  })
  return rows.map((r) => ({
    managerId: r.manager_id,
    managerName: r.manager_name,
    assignedMembers: r.assigned_members,
    pendingCount: r.pending_count,
    startedCount: r.started_count,
    inProgressCount: r.in_progress_count,
    completedCount: r.completed_count,
    notInterestedCount: r.not_interested_count,
    callbackRequiredCount: r.callback_required_count,
    otherCount: r.other_count,
    totalFollowups: r.total_followups,
  }))
}

export interface MemberGrowthRow {
  month: number
  year: number
  new_members: number
}

export async function getMemberGrowthTrend(getToken: GetToken, year: number): Promise<MemberGrowthRow[]> {
  const { rows } = await apiClient.get<{ rows: MemberGrowthRow[] }>('/api/dashboard', getToken, {
    type: 'memberGrowthTrend',
    year,
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
  memberMobileNumber: string | null
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
