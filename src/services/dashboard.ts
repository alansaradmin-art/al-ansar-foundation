import type { AppSupabaseClient } from '@/lib/supabase'

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
  client: AppSupabaseClient,
  managerId: string,
  month: number,
  year: number,
): Promise<ManagerDashboardStats> {
  const { data, error } = await client
    .rpc('manager_dashboard_stats', { p_manager_id: managerId, p_month: month, p_year: year })
    .single()
  if (error) throw error
  return data
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

export async function getAdminDashboardStats(
  client: AppSupabaseClient,
  month: number,
  year: number,
): Promise<AdminDashboardStats> {
  const { data, error } = await client.rpc('admin_dashboard_stats', { p_month: month, p_year: year }).single()
  if (error) throw error
  return data
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
  client: AppSupabaseClient,
  month: number,
  year: number,
): Promise<ManagerWiseReportRow[]> {
  const { data, error } = await client.rpc('manager_wise_report', { p_month: month, p_year: year })
  if (error) throw error
  return data ?? []
}

export interface MonthWiseReportRow {
  month: number
  year: number
  donation_count: number
  donation_amount: number
  completed_followups: number
  pending_followups: number
}

export async function getMonthWiseReport(client: AppSupabaseClient, year: number): Promise<MonthWiseReportRow[]> {
  const { data, error } = await client.rpc('month_wise_report', { p_year: year })
  if (error) throw error
  return data ?? []
}
