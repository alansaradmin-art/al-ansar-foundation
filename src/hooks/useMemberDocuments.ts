import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as documentsService from '@/services/documents'

export function useMemberDocuments(memberId: string | undefined) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: queryKeys.documents.forMember(memberId ?? ''),
    queryFn: () => documentsService.listMemberDocuments(getToken, memberId!),
    enabled: !!memberId,
  })
}

export function useUploadMemberDocument(memberId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => documentsService.uploadMemberDocument(getToken, memberId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.forMember(memberId) })
    },
  })
}

export function useDeleteMemberDocument(memberId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => documentsService.softDeleteDocument(getToken, id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.forMember(memberId) })
    },
  })
}

/** Opens a document in a new tab via a short-lived signed URL — fetched
 * fresh on every click rather than cached, since the URL expires quickly. */
export function useDownloadMemberDocument() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: (id: string) => documentsService.getDocumentDownloadUrl(getToken, id),
    onSuccess: ({ url }) => {
      window.open(url, '_blank', 'noopener,noreferrer')
    },
  })
}
