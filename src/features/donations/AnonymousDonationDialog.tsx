import { useState } from 'react'
import { toast } from 'sonner'
import { UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { DonationForm } from './DonationForm'
import { useCreateDonation } from '@/hooks/useDonations'
import { useProfile } from '@/contexts/ProfileContext'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { DonationFormValues } from '@/schemas/donation.schema'

/** Admin-only — records a donation with no member attached at all. The
 * server (api/donations.ts) is the real gate on who may do this; this
 * component only exists on the Admin Donations page, Managers have no
 * route that renders it. */
export function AnonymousDonationDialog() {
  const [open, setOpen] = useState(false)
  const { profile } = useProfile()
  const { mutate, isPending } = useCreateDonation(profile!.id)

  function handleSubmit(values: DonationFormValues) {
    mutate(values, {
      onSuccess: () => {
        toast.success('Anonymous donation recorded.')
        setOpen(false)
      },
      onError: (error) => {
        toast.error(getFriendlyErrorMessage(error, 'Unable to save donation. Please try again.'))
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline">
          <UserX className="size-4" /> Anonymous Donation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Anonymous Donation</DialogTitle>
          <DialogDescription>
            No member will be attached to this record — it's still counted in monthly totals and reports, but shown
            as "Anonymous Donation" everywhere donations are listed.
          </DialogDescription>
        </DialogHeader>
        <DonationForm onSubmit={handleSubmit} isSubmitting={isPending} />
      </DialogContent>
    </Dialog>
  )
}
