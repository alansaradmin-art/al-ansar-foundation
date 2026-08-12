import { authenticate, getServiceRoleClient, requireAdmin, resolveManagerScope } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import type { DonationType } from '../src/types/database'

interface DonationReportRow {
  id: string
  donation_id: string
  donation_date: string
  donation_type: DonationType
  amount_inr: number
  payment_method: string
  transaction_reference: string | null
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed.')

  const profile = await authenticate(req, res)
  if (!profile) return
  const supabase = getServiceRoleClient()
  const type = readQueryParam(req, 'type')

  try {
    if (type === 'manager') {
      const managerScope = resolveManagerScope(profile, readQueryParam(req, 'managerId'))
      if (!managerScope) return sendError(res, 400, 'managerId is required.')
      const month = Number(readQueryParam(req, 'month'))
      const year = Number(readQueryParam(req, 'year'))
      const { data, error } = await supabase
        .rpc('manager_dashboard_stats', { p_manager_id: managerScope, p_month: month, p_year: year })
        .single()
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, data)
    }

    if (type === 'admin') {
      if (!requireAdmin(res, profile)) return
      const month = Number(readQueryParam(req, 'month'))
      const year = Number(readQueryParam(req, 'year'))
      const { data, error } = await supabase.rpc('admin_dashboard_stats', { p_month: month, p_year: year }).single()
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, data)
    }

    if (type === 'managerWiseReport') {
      if (!requireAdmin(res, profile)) return
      const month = Number(readQueryParam(req, 'month'))
      const year = Number(readQueryParam(req, 'year'))
      const { data, error } = await supabase.rpc('manager_wise_report', { p_month: month, p_year: year })
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (type === 'monthWiseReport') {
      if (!requireAdmin(res, profile)) return
      const year = Number(readQueryParam(req, 'year'))
      const { data, error } = await supabase.rpc('month_wise_report', { p_year: year })
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (type === 'monthlyDonationReport') {
      if (!requireAdmin(res, profile)) return
      const month = Number(readQueryParam(req, 'month'))
      const year = Number(readQueryParam(req, 'year'))

      // A left join (not !inner) — an anonymous donation has no member row
      // to inner-join against and would otherwise vanish from this report.
      const { data, error } = await supabase
        .from('donations')
        .select(
          'id, donation_id, donation_date, donation_type, amount_inr, payment_method, transaction_reference, member_id, member:members(id, member_name, member_id)',
        )
        .eq('donation_month', month)
        .eq('donation_year', year)
        .eq('is_deleted', false)
        .order('donation_date', { ascending: false })
      if (error) return sendSupabaseError(res, error)
      const rows = data ?? []

      const summary = { totalCount: rows.length, totalAmount: 0, zakat: 0, sadaqah: 0, fitra: 0, generalOrOther: 0 }
      const membersById = new Map<
        string,
        { memberId: string; memberName: string; memberDisplayId: string; total: number; donations: DonationReportRow[] }
      >()
      const anonymous = { total: 0, donations: [] as DonationReportRow[] }

      for (const row of rows) {
        const amount = Number(row.amount_inr)
        summary.totalAmount += amount
        if (row.donation_type === 'ZAKAT') summary.zakat += amount
        else if (row.donation_type === 'SADAQAH') summary.sadaqah += amount
        else if (row.donation_type === 'FITRA') summary.fitra += amount
        else summary.generalOrOther += amount

        const reportRow: DonationReportRow = {
          id: row.id,
          donation_id: row.donation_id,
          donation_date: row.donation_date,
          donation_type: row.donation_type,
          amount_inr: amount,
          payment_method: row.payment_method,
          transaction_reference: row.transaction_reference,
        }

        const member = row.member as unknown as { id: string; member_name: string; member_id: string } | null
        if (member) {
          const existing = membersById.get(member.id)
          if (existing) {
            existing.total += amount
            existing.donations.push(reportRow)
          } else {
            membersById.set(member.id, {
              memberId: member.id,
              memberName: member.member_name,
              memberDisplayId: member.member_id,
              total: amount,
              donations: [reportRow],
            })
          }
        } else {
          anonymous.total += amount
          anonymous.donations.push(reportRow)
        }
      }

      const members = [...membersById.values()].sort((a, b) => a.memberName.localeCompare(b.memberName))
      return sendJson(res, 200, { summary, members, anonymous })
    }

    sendError(res, 400, 'Unknown dashboard type.')
  } catch (error) {
    console.error('[api/dashboard]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
