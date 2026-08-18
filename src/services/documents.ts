import { apiClient, type GetToken } from '@/lib/apiClient'
import type { MemberDocument } from '@/types'

export type MemberDocumentWithUploader = MemberDocument & {
  uploader: { full_name: string } | null
}

export async function listMemberDocuments(getToken: GetToken, memberId: string): Promise<MemberDocumentWithUploader[]> {
  const { rows } = await apiClient.get<{ rows: MemberDocumentWithUploader[] }>('/api/documents', getToken, {
    action: 'forMember',
    memberId,
  })
  return rows
}

interface CreateUploadUrlResponse {
  signedUrl: string
  token: string
  storagePath: string
  contentType: string
}

export async function createUploadUrl(
  getToken: GetToken,
  memberId: string,
  fileName: string,
  contentType: string,
  fileSize: number,
): Promise<CreateUploadUrlResponse> {
  return apiClient.post('/api/documents', getToken, {
    member_id: memberId,
    file_name: fileName,
    content_type: contentType,
    file_size: fileSize,
  }, { action: 'createUploadUrl' })
}

export async function confirmDocument(
  getToken: GetToken,
  params: { memberId: string; storagePath: string; fileName: string; fileSize: number; contentType: string },
): Promise<MemberDocument> {
  return apiClient.post(
    '/api/documents',
    getToken,
    {
      member_id: params.memberId,
      storage_path: params.storagePath,
      file_name: params.fileName,
      file_size: params.fileSize,
      content_type: params.contentType,
    },
    { action: 'confirm' },
  )
}

/** Uploads directly to Supabase Storage using the signed URL from
 * createUploadUrl — the token is already embedded in signedUrl's query
 * string, so this is a plain PUT, no Supabase client/keys needed
 * client-side (this app's browser code never talks to Supabase directly). */
export async function uploadToSignedUrl(signedUrl: string, file: File): Promise<void> {
  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!response.ok) throw new Error('Upload failed. Please try again.')
}

export async function uploadMemberDocument(getToken: GetToken, memberId: string, file: File): Promise<MemberDocument> {
  const { signedUrl, storagePath, contentType } = await createUploadUrl(
    getToken,
    memberId,
    file.name,
    file.type || 'application/octet-stream',
    file.size,
  )
  await uploadToSignedUrl(signedUrl, file)
  return confirmDocument(getToken, {
    memberId,
    storagePath,
    fileName: file.name,
    fileSize: file.size,
    contentType,
  })
}

export async function getDocumentDownloadUrl(getToken: GetToken, id: string): Promise<{ url: string; fileName: string }> {
  return apiClient.get('/api/documents', getToken, { action: 'downloadUrl', id })
}

export async function softDeleteDocument(getToken: GetToken, id: string, reason?: string): Promise<void> {
  await apiClient.patch('/api/documents', getToken, { reason }, { id, action: 'softDelete' })
}
