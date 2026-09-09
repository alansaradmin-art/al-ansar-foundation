import { randomUUID } from 'node:crypto'
import { authenticate, getServiceRoleClient, requireAdmin, resolveManagerScope } from './_lib/auth.js'
import {
  type ApiRequest,
  type ApiResponse,
  readJsonBody,
  readQueryParam,
  sendError,
  sendJson,
  sendSupabaseError,
} from './_lib/http.js'
import { logInsert, logUpdate } from './_lib/auditLog.js'
import { normalizeMobileNumber } from './_lib/phone.js'
import { isValidCountryIso2 } from './_lib/countries.js'
import type { CallerProfile } from './_lib/auth.js'
import type { Database, FollowUpStatus, MemberStatus } from '../src/types/database'

type MemberRow = Database['public']['Tables']['members']['Row']
type MemberInsert = Database['public']['Tables']['members']['Insert']
type DocumentInsert = Database['public']['Tables']['member_documents']['Insert']
type Supabase = ReturnType<typeof getServiceRoleClient>

const DOCUMENTS_BUCKET = 'member-documents'
const DOCUMENT_MAX_FILE_SIZE = 10 * 1024 * 1024

/** Prefers the new (country, local-number) pair sent by CountryPhoneField;
 * falls back to the old guess-based normalizeMobileNumber (country left
 * null) when no valid country was sent — e.g. a CSV import row with no
 * mapped country column. This is the one place old and new phone-entry
 * paths reconcile, so every write path (create/update/import) stays
 * correct whether or not the caller has been updated to send a country. */
function resolvePhone(
  number: string | null | undefined,
  country: string | null | undefined,
): { number: string | null; country: string | null } {
  if (isValidCountryIso2(country)) {
    return { number: number ? number.replace(/\D/g, '') || null : null, country: country.toUpperCase() }
  }
  return { number: number ? normalizeMobileNumber(number) : null, country: null }
}

// "Incomplete" = missing any of these — used by both ?action=incompleteCount
// and the main list's ?incomplete=true filter, so the definition can't drift
// between the count and the list it's counting.
const INCOMPLETE_MEMBER_OR = [
  'mobile_number.is.null',
  'mobile_number.eq.',
  'address.is.null',
  'address.eq.',
  'father_name.is.null',
  'father_name.eq.',
  'added_by_name.is.null',
  'added_by_name.eq.',
  'reference_contact_name.is.null',
  'reference_contact_name.eq.',
].join(',')

function toMemberRow(values: Partial<MemberInsert>): MemberInsert {
  const mobile = resolvePhone(values.mobile_number, values.mobile_country)
  const addedBy = resolvePhone(values.added_by_phone, values.added_by_country)
  const reference = resolvePhone(values.reference_contact_phone, values.reference_contact_country)
  return {
    member_name: values.member_name ?? '',
    father_name: values.father_name || null,
    mobile_number: mobile.number,
    mobile_country: mobile.country,
    address: values.address || null,
    added_by_type: values.added_by_type ?? null,
    added_by_id: values.added_by_type === 'REGISTERED_MEMBER' ? (values.added_by_id ?? null) : null,
    added_by_name: values.added_by_name || null,
    added_by_phone: addedBy.number,
    added_by_country: addedBy.country,
    reference_contact_type: values.reference_contact_type ?? null,
    reference_contact_id:
      values.reference_contact_type === 'REGISTERED_MEMBER' ? (values.reference_contact_id ?? null) : null,
    reference_contact_name: values.reference_contact_name || null,
    reference_contact_phone: reference.number,
    reference_contact_country: reference.country,
    reference_contact_relationship: values.reference_contact_relationship || null,
    assigned_manager_id: values.assigned_manager_id ?? null,
    status: values.status ?? 'ACTIVE',
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  const supabase = getServiceRoleClient()

  // Folded into this file rather than its own api/documents.ts — stays
  // under Vercel's Hobby-plan 12-serverless-function-per-deployment cap
  // (main was already sitting at exactly 12). A natural pairing anyway:
  // member documents are a sub-resource of members, not a standalone
  // concern. Self-contained handler, called before any members-specific
  // query param is read.
  if (readQueryParam(req, 'resource') === 'documents') return handleDocuments(req, res, profile, supabase)

  const action = readQueryParam(req, 'action')
  const id = readQueryParam(req, 'id')

  try {
    if (req.method === 'GET' && action === 'picker') {
      const search = (readQueryParam(req, 'search') ?? '').trim()
      const limit = Number(readQueryParam(req, 'limit') ?? '10')
      let query = supabase
        .from('members')
        .select('id, member_id, member_name, father_name, mobile_number, mobile_country')
        .eq('status', 'ACTIVE')
        .order('updated_at', { ascending: false })
        .limit(limit)
      const managerScope = resolveManagerScope(profile)
      if (managerScope) query = query.eq('assigned_manager_id', managerScope)
      if (search) query = query.or(`member_name.ilike.%${search}%,member_id.ilike.%${search}%,mobile_number.ilike.%${search}%`)
      const { data, error } = await query
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'GET' && action === 'count') {
      if (!requireAdmin(res, profile)) return
      const managerId = readQueryParam(req, 'managerId')
      if (!managerId) return sendError(res, 400, 'managerId is required.')
      const { count, error } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_manager_id', managerId)
        .eq('status', 'ACTIVE')
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { count: count ?? 0 })
    }

    if (req.method === 'GET' && action === 'unassignedCount') {
      if (!requireAdmin(res, profile)) return
      const { count, error } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .is('assigned_manager_id', null)
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { count: count ?? 0 })
    }

    if (req.method === 'GET' && action === 'incompleteCount') {
      if (!requireAdmin(res, profile)) return
      const { count, error } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ACTIVE')
        .or(INCOMPLETE_MEMBER_OR)
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { count: count ?? 0 })
    }

    if (req.method === 'GET' && action === 'checkIds') {
      if (!requireAdmin(res, profile)) return
      const ids = (readQueryParam(req, 'ids') ?? '').split(',').filter(Boolean)
      if (ids.length === 0) return sendJson(res, 200, { existingIds: [] })
      const { data, error } = await supabase.from('members').select('member_id').in('member_id', ids)
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { existingIds: (data ?? []).map((m) => m.member_id) })
    }

    if (req.method === 'GET' && action === 'checkMobileNumbers') {
      if (!requireAdmin(res, profile)) return
      const raw = (readQueryParam(req, 'numbers') ?? '').split(',').filter(Boolean)
      const normalized = [...new Set(raw.map(normalizeMobileNumber).filter(Boolean))]
      if (normalized.length === 0) return sendJson(res, 200, { existingNumbers: [] })
      const { data, error } = await supabase.from('members').select('mobile_number').in('mobile_number', normalized)
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { existingNumbers: (data ?? []).map((m) => m.mobile_number) })
    }

    if (req.method === 'GET' && id) {
      let query = supabase.from('members').select('*').eq('id', id)
      const managerScope = resolveManagerScope(profile)
      if (managerScope) query = query.eq('assigned_manager_id', managerScope)
      // A Manager can never see an INACTIVE member, even one of their own —
      // an inactive member simply doesn't exist for them, same 404 as a
      // member outside their scope entirely. Admin is unrestricted.
      if (profile.role === 'MANAGER') query = query.eq('status', 'ACTIVE')
      const { data, error } = await query.maybeSingle()
      if (error) return sendSupabaseError(res, error)
      if (!data) return sendError(res, 404, 'Member not found.')
      return sendJson(res, 200, data)
    }

    if (req.method === 'GET') {
      const search = readQueryParam(req, 'search')?.trim()
      const status = readQueryParam(req, 'status')
      const page = Number(readQueryParam(req, 'page') ?? '1')
      const pageSize = Number(readQueryParam(req, 'pageSize') ?? '20')
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase.from('members').select('*', { count: 'exact' }).order('updated_at', { ascending: false })
      const managerScope = resolveManagerScope(profile, readQueryParam(req, 'managerId'))
      if (managerScope) query = query.eq('assigned_manager_id', managerScope)
      else if (readQueryParam(req, 'unassigned') === 'true') query = query.is('assigned_manager_id', null)
      if (readQueryParam(req, 'incomplete') === 'true') query = query.or(INCOMPLETE_MEMBER_OR)
      // A Manager's list is always ACTIVE-only, regardless of any status
      // filter they request — enforced server-side so it can't be bypassed
      // by requesting ?status=INACTIVE (or omitting status) directly.
      // Admin keeps the existing unrestricted behavior.
      if (profile.role === 'MANAGER') {
        query = query.eq('status', 'ACTIVE')
      } else if (status) {
        query = query.eq('status', status as MemberStatus)
      }
      if (search) {
        query = query.or(
          `member_name.ilike.%${search}%,member_id.ilike.%${search}%,mobile_number.ilike.%${search}%,father_name.ilike.%${search}%`,
        )
      }
      const { data, error, count } = await query.range(from, to)
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [], count: count ?? 0 })
    }

    if (req.method === 'POST' && action === 'periodSummaries') {
      const { memberIds, month, year } = await readJsonBody<{ memberIds: string[]; month: number; year: number }>(req)
      if (!Array.isArray(memberIds) || memberIds.length === 0) return sendJson(res, 200, {})

      let scopedIdsQuery = supabase.from('members').select('id').in('id', memberIds)
      const managerScope = resolveManagerScope(profile)
      if (managerScope) scopedIdsQuery = scopedIdsQuery.eq('assigned_manager_id', managerScope)
      // Defense in depth: a Manager's period summaries should never surface
      // an INACTIVE member's data even if a stale/tampered client request
      // includes their id — matches the same restriction enforced on the
      // list/detail GET handlers above.
      if (profile.role === 'MANAGER') scopedIdsQuery = scopedIdsQuery.eq('status', 'ACTIVE')
      const { data: scopedMembers, error: scopeError } = await scopedIdsQuery
      if (scopeError) return sendSupabaseError(res, scopeError)
      const allowedIds = (scopedMembers ?? []).map((m) => m.id)
      if (allowedIds.length === 0) return sendJson(res, 200, {})

      const [donationsResult, followupsResult, pendingResult] = await Promise.all([
        supabase
          .from('donations')
          .select('member_id, amount_inr')
          .in('member_id', allowedIds)
          .eq('donation_month', month)
          .eq('donation_year', year)
          .eq('is_deleted', false),
        supabase
          .from('monthly_followups')
          .select('member_id, follow_up_status, follow_up_date, remarks, created_at')
          .in('member_id', allowedIds)
          .eq('month', month)
          .eq('year', year),
        supabase.rpc('is_pending_followup_batch', { p_member_ids: allowedIds, p_month: month, p_year: year }),
      ])
      if (donationsResult.error) return sendSupabaseError(res, donationsResult.error)
      if (followupsResult.error) return sendSupabaseError(res, followupsResult.error)
      if (pendingResult.error) return sendSupabaseError(res, pendingResult.error)

      interface PeriodSummary {
        donationTotal: number
        donationCount: number
        hasCompletedFollowup: boolean
        isPending: boolean
        // The most recently logged follow-up attempt this period (by
        // follow_up_date, tie-broken by created_at) — surfaced so a manager
        // can see a STARTED/IN_PROGRESS/etc. attempt (and its notes) on the
        // member list immediately, not just once it's COMPLETED.
        latestFollowupStatus: FollowUpStatus | null
        latestFollowupDate: string | null
        latestFollowupNotes: string | null
      }
      const summaries: Record<string, PeriodSummary> = {}
      for (const id of allowedIds) {
        summaries[id] = {
          donationTotal: 0,
          donationCount: 0,
          hasCompletedFollowup: false,
          isPending: false,
          latestFollowupStatus: null,
          latestFollowupDate: null,
          latestFollowupNotes: null,
        }
      }
      for (const d of donationsResult.data ?? []) {
        // member_id is only nullable for anonymous donations (see
        // supabase/migrations/0013_nullable_donation_member.sql), which can
        // never appear here anyway — the query above filters
        // .in('member_id', allowedIds), and NULL never matches an IN list.
        if (!d.member_id) continue
        summaries[d.member_id].donationTotal += Number(d.amount_inr)
        summaries[d.member_id].donationCount += 1
      }
      const latestCreatedAt: Record<string, string> = {}
      for (const f of followupsResult.data ?? []) {
        if (f.follow_up_status === 'COMPLETED') summaries[f.member_id].hasCompletedFollowup = true

        const summary = summaries[f.member_id]
        const isNewer =
          !summary.latestFollowupDate ||
          f.follow_up_date > summary.latestFollowupDate ||
          (f.follow_up_date === summary.latestFollowupDate && f.created_at > latestCreatedAt[f.member_id])
        if (isNewer) {
          summary.latestFollowupStatus = f.follow_up_status
          summary.latestFollowupDate = f.follow_up_date
          summary.latestFollowupNotes = f.remarks
          latestCreatedAt[f.member_id] = f.created_at
        }
      }
      for (const p of pendingResult.data ?? []) {
        if (summaries[p.member_id]) summaries[p.member_id].isPending = p.is_pending
      }
      return sendJson(res, 200, summaries)
    }

    if (req.method === 'POST' && action === 'lastDonationDates') {
      if (!requireAdmin(res, profile)) return
      const { memberIds } = await readJsonBody<{ memberIds: string[] }>(req)
      if (!Array.isArray(memberIds) || memberIds.length === 0) return sendJson(res, 200, {})
      const { data, error } = await supabase.rpc('member_last_donation_dates', { p_member_ids: memberIds })
      if (error) return sendSupabaseError(res, error)
      const dates: Record<string, string | null> = {}
      for (const row of data ?? []) dates[row.member_id] = row.last_donation_date
      return sendJson(res, 200, dates)
    }

    if (req.method === 'POST' && action === 'reassign') {
      if (!requireAdmin(res, profile)) return
      const { memberIds, managerId } = await readJsonBody<{ memberIds: string[]; managerId: string }>(req)
      if (!Array.isArray(memberIds) || memberIds.length === 0 || !managerId) {
        return sendError(res, 400, 'memberIds and managerId are required.')
      }
      const { data: oldRows, error: oldError } = await supabase.from('members').select('*').in('id', memberIds)
      if (oldError) return sendSupabaseError(res, oldError)

      const { data: newRows, error } = await supabase
        .from('members')
        .update({ assigned_manager_id: managerId })
        .in('id', memberIds)
        .select('*')
      if (error) return sendSupabaseError(res, error)

      const oldById = new Map((oldRows ?? []).map((r) => [r.id, r]))
      await Promise.all(
        (newRows ?? []).map((newRow) => {
          const oldRow = oldById.get(newRow.id)
          return oldRow ? logUpdate(supabase, 'members', profile.id, oldRow, newRow) : Promise.resolve()
        }),
      )
      return sendJson(res, 200, { rows: newRows ?? [] })
    }

    if (req.method === 'POST' && action === 'import') {
      if (!requireAdmin(res, profile)) return
      const { rows } = await readJsonBody<{ rows: Partial<MemberInsert>[] }>(req)
      if (!Array.isArray(rows) || rows.length === 0) return sendError(res, 400, 'rows is required.')
      // Unlike create/update (member_id is always system-generated, see
      // src/schemas/member.schema.ts), an import row may already carry a
      // historical member_id from the CSV — preserve it if present; the
      // generate_member_id() trigger only fills it in when it's missing.
      const insertRows = rows.map((row) => ({ ...toMemberRow(row), member_id: row.member_id || undefined }))
      const { data, error } = await supabase.from('members').insert(insertRows).select('*')
      if (error) return sendSupabaseError(res, error)
      await Promise.all((data ?? []).map((row) => logInsert(supabase, 'members', profile.id, row)))
      return sendJson(res, 201, { rows: data ?? [] })
    }

    if (req.method === 'POST') {
      if (!requireAdmin(res, profile)) return
      const values = await readJsonBody<Partial<MemberInsert>>(req)
      const { data, error } = await supabase.from('members').insert(toMemberRow(values)).select('*').single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'members', profile.id, data)
      return sendJson(res, 201, data)
    }

    if (req.method === 'PUT' && id) {
      if (!requireAdmin(res, profile)) return
      const values = await readJsonBody<Partial<MemberInsert>>(req)
      const { data: oldRow, error: oldError } = await supabase.from('members').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Member not found.')

      const { data, error } = await supabase.from('members').update(toMemberRow(values)).eq('id', id).select('*').single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'members', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    if (req.method === 'PATCH' && id && action === 'status') {
      if (!requireAdmin(res, profile)) return
      const { status } = await readJsonBody<{ status: MemberRow['status'] }>(req)
      const { data: oldRow, error: oldError } = await supabase.from('members').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Member not found.')

      const { data, error } = await supabase.from('members').update({ status }).eq('id', id).select('*').single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'members', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/members]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}

// ── ?resource=documents ─────────────────────────────────────
async function handleDocuments(req: ApiRequest, res: ApiResponse, profile: CallerProfile, supabase: Supabase) {
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

      const { data, error } = await supabase
        .from('member_documents')
        .select('*, uploader:profiles!member_documents_uploaded_by_fkey(full_name)')
        .eq('member_id', memberId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'GET' && action === 'downloadUrl') {
      if (!id) return sendError(res, 400, 'id is required.')
      const { data: doc, error: docError } = await supabase
        .from('member_documents')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .maybeSingle()
      if (docError) return sendSupabaseError(res, docError)
      if (!doc) return sendError(res, 404, 'Document not found.')

      if (profile.role !== 'ADMIN') {
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('assigned_manager_id')
          .eq('id', doc.member_id)
          .maybeSingle()
        if (memberError) return sendSupabaseError(res, memberError)
        if (!member || member.assigned_manager_id !== profile.managerId) {
          return sendError(res, 404, 'Document not found.')
        }
      }

      const { data: signed, error: signError } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(doc.storage_path, 60)
      if (signError) return sendError(res, 500, 'Unable to generate a download link. Please try again.')
      return sendJson(res, 200, { url: signed.signedUrl, fileName: doc.file_name })
    }

    if (req.method === 'POST' && action === 'createUploadUrl') {
      const { member_id, file_name, content_type, file_size } = await readJsonBody<{
        member_id: string
        file_name: string
        content_type: string
        file_size: number
      }>(req)
      if (!member_id || !file_name) return sendError(res, 400, 'member_id and file_name are required.')
      if (file_size > DOCUMENT_MAX_FILE_SIZE) return sendError(res, 400, 'File is larger than the 10MB limit.')

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('assigned_manager_id')
        .eq('id', member_id)
        .maybeSingle()
      if (memberError) return sendSupabaseError(res, memberError)
      if (!member) return sendError(res, 404, 'Member not found.')
      if (profile.role !== 'ADMIN' && member.assigned_manager_id !== profile.managerId) {
        return sendError(res, 403, 'You can only upload documents for your own members.')
      }

      // The stored path never trusts the client-supplied file name beyond its
      // extension — a fresh random id keeps two uploads from ever colliding
      // and rules out any path-traversal via a crafted file_name. The
      // original name is preserved separately, in the member_documents row,
      // for display.
      const extensionMatch = /\.[a-zA-Z0-9]{1,10}$/.exec(file_name)
      const extension = extensionMatch ? extensionMatch[0] : ''
      const storagePath = `${member_id}/${randomUUID()}${extension}`

      const { data: signed, error: signError } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(storagePath)
      if (signError) return sendError(res, 500, 'Unable to prepare the upload. Please try again.')
      return sendJson(res, 200, {
        signedUrl: signed.signedUrl,
        token: signed.token,
        storagePath,
        contentType: content_type,
      })
    }

    if (req.method === 'POST' && action === 'confirm') {
      const values = await readJsonBody<Partial<DocumentInsert>>(req)
      if (!values.member_id || !values.storage_path || !values.file_name) {
        return sendError(res, 400, 'member_id, storage_path, and file_name are required.')
      }

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('assigned_manager_id')
        .eq('id', values.member_id)
        .maybeSingle()
      if (memberError) return sendSupabaseError(res, memberError)
      if (!member) return sendError(res, 404, 'Member not found.')
      if (profile.role !== 'ADMIN' && member.assigned_manager_id !== profile.managerId) {
        return sendError(res, 403, 'You can only upload documents for your own members.')
      }

      const { data, error } = await supabase
        .from('member_documents')
        .insert({
          member_id: values.member_id,
          file_name: values.file_name,
          storage_path: values.storage_path,
          file_size: values.file_size ?? 0,
          content_type: values.content_type ?? 'application/octet-stream',
          // Always the caller's own profile id — never trust a client-supplied
          // uploaded_by.
          uploaded_by: profile.id,
        })
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'member_documents', profile.id, data)
      return sendJson(res, 201, data)
    }

    if (req.method === 'PATCH' && id && action === 'softDelete') {
      if (!requireAdmin(res, profile)) return
      const { reason } = await readJsonBody<{ reason?: string }>(req)
      const { data: oldRow, error: oldError } = await supabase.from('member_documents').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Document not found.')

      const { data, error } = await supabase
        .from('member_documents')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          // Always the caller's own profile id — never trust a client-supplied
          // deleted_by.
          deleted_by: profile.id,
          deletion_reason: reason || null,
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'member_documents', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/members?resource=documents]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
