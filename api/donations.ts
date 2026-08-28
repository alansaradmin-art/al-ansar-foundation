import { authenticate, getServiceRoleClient, requireAdmin, resolveManagerScope } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import { logInsert, logUpdate, writeAuditLog } from './_lib/auditLog.js'
import type { Database, DonationType, PaymentMethod } from '../src/types/database'

type DonationInsert = Database['public']['Tables']['donations']['Insert']
type MemberRow = Database['public']['Tables']['members']['Row']

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  const supabase = getServiceRoleClient()
  const action = readQueryParam(req, 'action')
  const id = readQueryParam(req, 'id')

  try {
    if (req.method === 'GET' && action === 'forMember') {
      const memberId = readQueryParam(req, 'memberId')
      if (!memberId) return sendError(res, 400, 'memberId is required.')

      if (profile.role !== 'ADMIN') {
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('assigned_manager_id')
          .eq('id', memberId)
          .maybeSingle()
        if (memberError) return sendSupabaseError(res, memberError)
        if (!member || member.assigned_manager_id !== profile.managerId) {
          return sendError(res, 404, 'Member not found.')
        }
      }

      // recorder embed added for the receipt feature's "Received/entered
      // by" field — every other donation-fetching query already has this
      // (the admin list, below); this was the one place that didn't.
      const { data, error } = await supabase
        .from('donations')
        .select('*, recorder:profiles!donations_recorded_by_fkey(full_name)')
        .eq('member_id', memberId)
        .eq('is_deleted', false)
        .order('donation_date', { ascending: false })
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'GET') {
      const month = readQueryParam(req, 'month')
      const year = readQueryParam(req, 'year')
      const memberId = readQueryParam(req, 'memberId')
      const paymentMethod = readQueryParam(req, 'paymentMethod')
      const donationType = readQueryParam(req, 'donationType')
      const dateFrom = readQueryParam(req, 'dateFrom')
      const dateTo = readQueryParam(req, 'dateTo')
      const page = Number(readQueryParam(req, 'page') ?? '1')
      const pageSize = Number(readQueryParam(req, 'pageSize') ?? '25')
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const managerScope = resolveManagerScope(profile, readQueryParam(req, 'managerId'))

      // A left join (not !inner) when unscoped — an anonymous donation
      // (member_id null) has no row to inner-join against and would
      // otherwise vanish from this list/count/export entirely. But a
      // filter on a *left*-joined embedded column only nulls out the
      // embedded object for non-matching rows — per PostgREST's documented
      // semantics it does NOT exclude the parent `donations` row. So when
      // a manager scope applies, the embed must be !inner or
      // `.eq('member.assigned_manager_id', ...)` below is a no-op and
      // every manager can see every other manager's donations (and bypass
      // it entirely via ?memberId=<any id>). !inner also correctly drops
      // anonymous donations from a manager-scoped view, which is right —
      // they belong to no manager.
      const memberEmbed = managerScope
        ? 'member:members!inner(member_name, member_id, father_name, mobile_number, mobile_country, assigned_manager_id)'
        : 'member:members(member_name, member_id, father_name, mobile_number, mobile_country, assigned_manager_id)'

      let query = supabase
        .from('donations')
        .select(
          `id, donation_id, member_id, donation_date, donation_month, donation_year, amount_inr, payment_method, donation_type, transaction_reference, notes, donor_name, recorded_by, is_deleted, created_at, ${memberEmbed}, recorder:profiles!donations_recorded_by_fkey(full_name)`,
          { count: 'exact' },
        )
        .eq('is_deleted', false)
        .order('donation_date', { ascending: false })

      if (month) query = query.eq('donation_month', Number(month))
      if (year) query = query.eq('donation_year', Number(year))
      if (memberId) query = query.eq('member_id', memberId)
      if (paymentMethod) query = query.eq('payment_method', paymentMethod as PaymentMethod)
      if (donationType) query = query.eq('donation_type', donationType as DonationType)
      if (dateFrom) query = query.gte('donation_date', dateFrom)
      if (dateTo) query = query.lte('donation_date', dateTo)

      if (managerScope) query = query.eq('member.assigned_manager_id', managerScope)

      const { data, error, count } = await query.range(from, to)
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [], count: count ?? 0 })
    }

    if (req.method === 'POST') {
      const values = await readJsonBody<Partial<DonationInsert> & { donation_date: string; confirmDuplicate?: boolean }>(req)

      // Authoritative check — the client can't be trusted to enforce this,
      // and the server can't rely on any particular caller's own clock, so
      // "today" is computed explicitly in this foundation's timezone rather
      // than the server process's own (Vercel runs functions in UTC).
      // Mirrors api/followups.ts's identical check.
      const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      if (values.donation_date > todayIST) {
        return sendError(res, 400, 'Donation date cannot be in the future.')
      }

      // Fetched once, for both the manager-scope permission check below and
      // the auto-reactivation check after the donation is inserted (a
      // member's current status can only be known by reading the row).
      let member: MemberRow | null = null
      if (values.member_id) {
        const { data, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', values.member_id)
          .maybeSingle()
        if (memberError) return sendSupabaseError(res, memberError)
        member = data
        if (profile.role !== 'ADMIN') {
          if (!member || member.assigned_manager_id !== profile.managerId) {
            return sendError(res, 403, 'You can only record donations for your own members.')
          }
        }
      } else if (profile.role !== 'ADMIN') {
        // No member_id — this is an anonymous donation. Only Admins may
        // record one; this is the real enforcement boundary, not just the
        // absence of the entry point in the Manager UI.
        return sendError(res, 403, 'Only Admins can record a donation without a member.')
      }

      // Soft duplicate check — a warning, not a block (see the hard
      // transaction_reference unique index for the one case that IS
      // always a real error). Skipped for anonymous donations (nothing to
      // dedupe against) and when the caller already confirmed once.
      if (values.member_id && !values.confirmDuplicate) {
        const { data: existingDonation, error: dupError } = await supabase
          .from('donations')
          .select('*')
          .eq('member_id', values.member_id)
          .eq('donation_date', values.donation_date)
          .eq('amount_inr', values.amount_inr!)
          .eq('donation_type', values.donation_type!)
          .eq('is_deleted', false)
          .maybeSingle()
        if (dupError) return sendSupabaseError(res, dupError)
        if (existingDonation) {
          return sendJson(res, 409, {
            error: {
              message: 'A donation for this member, date, amount, and type may already be recorded.',
              code: 'POSSIBLE_DUPLICATE',
            },
            existing: existingDonation,
          })
        }
      }

      const [year, month] = values.donation_date.split('-').map(Number)
      const { data, error } = await supabase
        .from('donations')
        .insert({
          member_id: values.member_id ?? null,
          donation_date: values.donation_date,
          donation_month: month,
          donation_year: year,
          amount_inr: values.amount_inr!,
          payment_method: values.payment_method!,
          donation_type: values.donation_type!,
          transaction_reference: values.transaction_reference || null,
          notes: values.notes || null,
          // Only meaningful without a member — see the donor_name column
          // comment in the migration. Silently ignored (never persisted)
          // when a real member_id is present, same as the client only ever
          // rendering this field for an anonymous donation.
          donor_name: values.member_id ? null : values.donor_name || null,
          // Always the caller's own profile id — never trust a client-supplied
          // recorded_by, matching the old RLS-forced check exactly.
          recorded_by: profile.id,
        })
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'donations', profile.id, data)

      // A new donation is exactly the signal that reverses inactivity —
      // auto-reactivate, and log it as a real (non-system) change since a
      // real person's action (recording this donation) caused it. Never
      // fails the donation response over this: the donation already saved,
      // and reactivation is a secondary consequence of it.
      if (member && member.status === 'INACTIVE') {
        const { data: reactivated, error: reactivateError } = await supabase
          .from('members')
          .update({ status: 'ACTIVE' })
          .eq('id', member.id)
          .select('*')
          .single()
        if (reactivateError) {
          console.error('[api/donations] failed to auto-reactivate member', member.id, reactivateError)
        } else if (reactivated) {
          await logUpdate(supabase, 'members', profile.id, member, reactivated)
        }
      }

      return sendJson(res, 201, data)
    }

    if (req.method === 'PATCH' && id && action === 'update') {
      if (!requireAdmin(res, profile)) return
      const { data: oldRow, error: oldError } = await supabase.from('donations').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Donation not found.')
      if (oldRow.is_deleted) return sendError(res, 400, 'Cannot edit a removed donation.')

      const values = await readJsonBody<Partial<DonationInsert> & { donation_date: string; confirmDuplicate?: boolean }>(req)

      const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      if (values.donation_date > todayIST) {
        return sendError(res, 400, 'Donation date cannot be in the future.')
      }

      // Same soft check as create — editing a donation into an accidental
      // collision with another real donation should be caught too.
      // Excludes this donation's own row and, like create, only runs for
      // a real member (never for editing an anonymous donation).
      if (values.member_id && !values.confirmDuplicate) {
        const { data: existingDonation, error: dupError } = await supabase
          .from('donations')
          .select('*')
          .eq('member_id', values.member_id)
          .eq('donation_date', values.donation_date)
          .eq('amount_inr', values.amount_inr!)
          .eq('donation_type', values.donation_type!)
          .eq('is_deleted', false)
          .neq('id', id)
          .maybeSingle()
        if (dupError) return sendSupabaseError(res, dupError)
        if (existingDonation) {
          return sendJson(res, 409, {
            error: {
              message: 'A donation for this member, date, amount, and type may already be recorded.',
              code: 'POSSIBLE_DUPLICATE',
            },
            existing: existingDonation,
          })
        }
      }

      const [year, month] = values.donation_date.split('-').map(Number)
      const { data, error } = await supabase
        .from('donations')
        .update({
          member_id: values.member_id ?? null,
          donation_date: values.donation_date,
          donation_month: month,
          donation_year: year,
          amount_inr: values.amount_inr!,
          payment_method: values.payment_method!,
          donation_type: values.donation_type!,
          transaction_reference: values.transaction_reference || null,
          notes: values.notes || null,
          donor_name: values.member_id ? null : values.donor_name || null,
          // donation_id, recorded_by, is_deleted, deleted_at/by/reason,
          // created_at are intentionally absent — never taken from the
          // client payload, so a crafted request body can't touch them.
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'donations', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    if (req.method === 'PATCH' && id && action === 'softDelete') {
      if (!requireAdmin(res, profile)) return
      const { reason } = await readJsonBody<{ reason: string }>(req)
      const { data: oldRow, error: oldError } = await supabase.from('donations').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Donation not found.')

      const { data, error } = await supabase
        .from('donations')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          // Always the caller's own profile id — never trust a client-supplied
          // deleted_by.
          deleted_by: profile.id,
          deletion_reason: reason,
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'donations', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    if (req.method === 'POST' && action === 'logReceiptEvent') {
      // Write-only audit trail entry about a donation id the caller already
      // legitimately has (never returns or mutates donation data) — no
      // extra manager-scope check beyond being signed in, same reasoning
      // as this file's other secondary/never-block-the-primary-thing side
      // effects (see the reactivation logging above).
      const { id: donationId, event } = await readJsonBody<{ id: string; event: string }>(req)
      if (!donationId || !event) return sendError(res, 400, 'id and event are required.')
      await writeAuditLog(supabase, {
        actorProfileId: profile.id,
        action: `donations_receipt_${event}`,
        entityType: 'donations',
        entityId: donationId,
      })
      return sendJson(res, 200, { ok: true })
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/donations]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
