import { apiClient, type GetToken } from '@/lib/apiClient'

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

export async function getManagerWiseReport(getToken: GetToken, month: number, year: number): Promise<ManagerWiseReportRow[]> {
  const { rows } = await apiClient.get<{ rows: ManagerWiseReportRow[] }>('/api/dashboard', getToken, {
    type: 'managerWiseReport',
    month,
    year,
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

export async function getMonthWiseReport(getToken: GetToken, year: number): Promise<MonthWiseReportRow[]> {
  const { rows } = await apiClient.get<{ rows: MonthWiseReportRow[] }>('/api/dashboard', getToken, {
    type: 'monthWiseReport',
    year,
  })
  return rows
}
