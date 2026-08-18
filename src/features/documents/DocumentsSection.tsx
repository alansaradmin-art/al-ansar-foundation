import { useRef, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { FileText, Upload, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/StateViews'
import { CardListSkeleton } from '@/components/LoadingSkeletons'
import { RemoveDocumentDialog } from './RemoveDocumentDialog'
import { useMemberDocuments, useUploadMemberDocument, useDownloadMemberDocument } from '@/hooks/useMemberDocuments'
import { getFriendlyErrorMessage } from '@/lib/errors'
import { formatDateTime, formatFileSize } from '@/lib/format'
import type { MemberDocumentWithUploader } from '@/services/documents'

const MAX_FILE_SIZE = 10 * 1024 * 1024

/** Its own mutation instance per row, so downloading one document doesn't
 * disable every other row's download button while its signed URL loads. */
function DocumentRow({ doc, memberId, canDelete }: { doc: MemberDocumentWithUploader; memberId: string; canDelete: boolean }) {
  const { mutate: download, isPending: isDownloading } = useDownloadMemberDocument()

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold/25 text-gold-foreground">
        <FileText className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{doc.file_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(doc.file_size)} · {doc.uploader?.full_name ?? 'Unknown'} · {formatDateTime(doc.created_at)}
        </p>
      </div>
      <Button variant="ghost" size="icon" disabled={isDownloading} onClick={() => download(doc.id)}>
        <Download className="size-4" />
      </Button>
      {canDelete && <RemoveDocumentDialog documentId={doc.id} memberId={memberId} fileName={doc.file_name} />}
    </li>
  )
}

/** Both Admins and Managers can upload/view documents for a member they can
 * access; only an Admin can remove one (canDelete), mirroring the same
 * Admin-only removal rule already established for donations. */
export function DocumentsSection({ memberId, canDelete }: { memberId: string; canDelete: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: documents = [], isLoading } = useMemberDocuments(memberId)
  const { mutate: upload, isPending: isUploading } = useUploadMemberDocument(memberId)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File is larger than the 10MB limit.')
      return
    }
    upload(file, {
      onSuccess: () => toast.success('Document uploaded.'),
      onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to upload this document.')),
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Documents</CardTitle>
        <Button size="sm" variant="outline" disabled={isUploading} onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" /> {isUploading ? 'Uploading…' : 'Upload'}
        </Button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <CardListSkeleton count={2} />
        ) : documents.length === 0 ? (
          <EmptyState title="No documents uploaded for this member." icon={<FileText className="size-6" />} />
        ) : (
          <ul className="divide-y">
            {documents.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} memberId={memberId} canDelete={canDelete} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
