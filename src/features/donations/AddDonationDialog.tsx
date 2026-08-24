import { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DuplicateConfirmDialog } from '@/components/DuplicateConfirmDialog'
import { DonationForm } from './DonationForm'
import { DonationDuplicateSummary } from './DonationDuplicateSummary'
import { useCreateDonation } from '@/hooks/useDonations'
import { useDuplicateConfirmation } from '@/hooks/useDuplicateConfirmation'
import { useProfile } from '@/contexts/ProfileContext'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { DonationFormValues } from '@/schemas/donation.schema'
import type { Donation } from '@/types'

export function AddDonationDialog({
  memberId,
  variant = 'default',
  size = 'lg',
  className = 'flex-1',
}: {
  memberId: string
  variant?: 'outline' | 'default'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const { profile } = useProfile()
  const { mutate, isPending } = useCreateDonation(profile!.id)
  const { duplicate, checkError, clear } = useDuplicateConfirmation<DonationFormValues, Donation>()

  function handleSubmit(values: DonationFormValues) {
    mutate(values, {
      onSuccess: () => {
        toast.success('Donation received — recorded successfully.')
        setOpen(false)
        clear()
      },
      onError: (error) => {
        if (checkError(error, values)) return
        toast.error(getFriendlyErrorMessage(error, 'Unable to save donation. Please try again.'))
      },
    })
  }

  function handleConfirmDuplicate() {
    if (!duplicate) return
    mutate(
      { ...duplicate.values, confirmDuplicate: true },
      {
        onSuccess: () => {
          toast.success('Donation received — recorded successfully.')
          setOpen(false)
          clear()
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to save donation. Please try again.')),
      },
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size={size} variant={variant} className={className}>
            <Plus className="size-4" /> Add Donation
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a Donation</DialogTitle>
          </DialogHeader>
          <DonationForm memberId={memberId} onSubmit={handleSubmit} isSubmitting={isPending} />
        </DialogContent>
      </Dialog>

      {duplicate && (
        <DuplicateConfirmDialog
          open
          onOpenChange={(next) => !next && clear()}
          message="A donation for this member, date, amount, and type may already be recorded:"
          summary={<DonationDuplicateSummary donation={duplicate.existing} />}
          onConfirm={handleConfirmDuplicate}
          isConfirming={isPending}
        />
      )}
    </>
  )
}
