import { randomUUID } from 'node:crypto'
import { authenticate, getServiceRoleClient, requireAdmin } from './_lib/auth.js'
import { type ApiRequest, type ApiResponse, readJsonBody, readQueryParam, sendError, sendJson, sendSupabaseError } from './_lib/http.js'
import { logInsert, logUpdate } from './_lib/auditLog.js'
import type { Database } from '../src/types/database'

type AttachmentInsert = Database['public']['Tables']['expense_attachments']['Insert']

const BUCKET = 'expense-attachments'
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Mirrors api/documents.ts's shape exactly (signed-upload-URL, confirm,
// signed-download-URL, soft-delete) — same private-bucket pattern, just
// scoped to expenses instead of members. Admin-only throughout Phase 1.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const profile = await authenticate(req, res)
  if (!profile) return
  if (!requireAdmin(res, profile)) return
  const supabase = getServiceRoleClient()
  const action = readQueryParam(req, 'action')
  const id = readQueryParam(req, 'id')

  try {
    if (req.method === 'GET' && action === 'forExpense') {
      const expenseId = readQueryParam(req, 'expenseId')
      if (!expenseId) return sendError(res, 400, 'expenseId is required.')

      const { data, error } = await supabase
        .from('expense_attachments')
        .select('*, uploader:profiles!expense_attachments_uploaded_by_fkey(full_name)')
        .eq('expense_id', expenseId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      if (error) return sendSupabaseError(res, error)
      return sendJson(res, 200, { rows: data ?? [] })
    }

    if (req.method === 'GET' && action === 'downloadUrl') {
      if (!id) return sendError(res, 400, 'id is required.')
      const { data: doc, error: docError } = await supabase
        .from('expense_attachments')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .maybeSingle()
      if (docError) return sendSupabaseError(res, docError)
      if (!doc) return sendError(res, 404, 'Attachment not found.')

      const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 60)
      if (signError) return sendError(res, 500, 'Unable to generate a download link. Please try again.')
      return sendJson(res, 200, { url: signed.signedUrl, fileName: doc.file_name })
    }

    if (req.method === 'POST' && action === 'createUploadUrl') {
      const { expense_id, file_name, content_type, file_size } = await readJsonBody<{
        expense_id: string
        file_name: string
        content_type: string
        file_size: number
      }>(req)
      if (!expense_id || !file_name) return sendError(res, 400, 'expense_id and file_name are required.')
      if (file_size > MAX_FILE_SIZE) return sendError(res, 400, 'File is larger than the 10MB limit.')

      const { data: expense, error: expenseError } = await supabase.from('expenses').select('id').eq('id', expense_id).maybeSingle()
      if (expenseError) return sendSupabaseError(res, expenseError)
      if (!expense) return sendError(res, 404, 'Expense not found.')

      // Never trust the client-supplied file name beyond its extension — a
      // fresh random id rules out collisions and path traversal alike; the
      // original name is preserved separately for display.
      const extensionMatch = /\.[a-zA-Z0-9]{1,10}$/.exec(file_name)
      const extension = extensionMatch ? extensionMatch[0] : ''
      const storagePath = `${expense_id}/${randomUUID()}${extension}`

      const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath)
      if (signError) return sendError(res, 500, 'Unable to prepare the upload. Please try again.')
      return sendJson(res, 200, { signedUrl: signed.signedUrl, token: signed.token, storagePath, contentType: content_type })
    }

    if (req.method === 'POST' && action === 'confirm') {
      const values = await readJsonBody<Partial<AttachmentInsert>>(req)
      if (!values.expense_id || !values.storage_path || !values.file_name) {
        return sendError(res, 400, 'expense_id, storage_path, and file_name are required.')
      }

      const { data, error } = await supabase
        .from('expense_attachments')
        .insert({
          expense_id: values.expense_id,
          file_name: values.file_name,
          storage_path: values.storage_path,
          file_size: values.file_size ?? 0,
          content_type: values.content_type ?? 'application/octet-stream',
          // Always the caller's own profile id — never trust a
          // client-supplied uploaded_by.
          uploaded_by: profile.id,
        })
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logInsert(supabase, 'expense_attachments', profile.id, data)
      return sendJson(res, 201, data)
    }

    if (req.method === 'PATCH' && id && action === 'softDelete') {
      const { reason } = await readJsonBody<{ reason?: string }>(req)
      const { data: oldRow, error: oldError } = await supabase.from('expense_attachments').select('*').eq('id', id).maybeSingle()
      if (oldError) return sendSupabaseError(res, oldError)
      if (!oldRow) return sendError(res, 404, 'Attachment not found.')

      const { data, error } = await supabase
        .from('expense_attachments')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id,
          deletion_reason: reason || null,
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) return sendSupabaseError(res, error)
      await logUpdate(supabase, 'expense_attachments', profile.id, oldRow, data)
      return sendJson(res, 200, data)
    }

    sendError(res, 404, 'Not found.')
  } catch (error) {
    console.error('[api/expense-attachments]', error)
    sendError(res, 500, 'Something went wrong. Please try again.')
  }
}
