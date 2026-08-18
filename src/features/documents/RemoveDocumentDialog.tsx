import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useDeleteMemberDocument } from '@/hooks/useMemberDocuments'
import { getFriendlyErrorMessage } from '@/lib/errors'

/** Mirrors SoftDeleteDonationDialog exactly — same soft-delete shape
 * (is_deleted/deleted_at/deleted_by/deletion_reason), same Admin-only
 * reason-required flow. */
export function RemoveDocumentDialog({ documentId, memberId, fileName }: { documentId: string; memberId: string; fileName: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { mutate, isPending } = useDeleteMemberDocument(memberId)

  function handleConfirm() {
    mutate(
      { id: documentId, reason },
      {
        onSuccess: () => {
          toast.success('Document removed.')
          setOpen(false)
          setReason('')
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to remove this document.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove "{fileName}"?</DialogTitle>
          <DialogDescription>
            This is kept on file for audit purposes and can only be done by an Admin. Please note why this document
            is being removed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Reason</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!reason.trim() || isPending} onClick={handleConfirm}>
            {isPending ? 'Removing…' : 'Remove Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
