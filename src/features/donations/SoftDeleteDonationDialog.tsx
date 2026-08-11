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
import { useSoftDeleteDonation } from '@/hooks/useDonations'
import { useProfile } from '@/contexts/ProfileContext'
import { getFriendlyErrorMessage } from '@/lib/errors'

export function SoftDeleteDonationDialog({ donationId }: { donationId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { profile } = useProfile()
  const { mutate, isPending } = useSoftDeleteDonation()

  function handleConfirm() {
    mutate(
      { id: donationId, deletedBy: profile!.id, reason },
      {
        onSuccess: () => {
          toast.success('Donation record removed.')
          setOpen(false)
          setReason('')
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to remove this donation.')),
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
          <DialogTitle>Remove this donation record?</DialogTitle>
          <DialogDescription>
            This is kept on file for audit purposes and can only be done by an Admin. Please note why this record
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
            Remove Donation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
