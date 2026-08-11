import { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DonationForm } from './DonationForm'
import { useCreateDonation } from '@/hooks/useDonations'
import { useProfile } from '@/contexts/ProfileContext'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { DonationFormValues } from '@/schemas/donation.schema'

export function AddDonationDialog({
  memberId,
  variant = 'default',
}: {
  memberId: string
  variant?: 'outline' | 'default'
}) {
  const [open, setOpen] = useState(false)
  const { profile } = useProfile()
  const { mutate, isPending } = useCreateDonation(profile!.id)

  function handleSubmit(values: DonationFormValues) {
    mutate(values, {
      onSuccess: () => {
        toast.success('Donation received — recorded successfully.')
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
        <Button size="lg" variant={variant} className="flex-1">
          <Plus className="size-4" /> Add Donation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record a Donation</DialogTitle>
        </DialogHeader>
        <DonationForm memberId={memberId} onSubmit={handleSubmit} isSubmitting={isPending} />
      </DialogContent>
    </Dialog>
  )
}
