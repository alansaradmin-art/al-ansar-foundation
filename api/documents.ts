import { randomUUID } from 'node:crypto'
import { authenticate, getServiceRoleClient, requireAdmin } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import { logInsert, logUpdate } from './_lib/auditLog.js'
import type { Database } from '../src/types/database'

type DocumentInsert = Database['public']['Tables']['member_documents']['Insert']

const BUCKET = 'member-documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024

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

      const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 60)
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
      if (file_size > MAX_FILE_SIZE) return sendError(res, 400, 'File is larger than the 10MB limit.')

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

      const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath)
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
    console.error('[api/documents]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
