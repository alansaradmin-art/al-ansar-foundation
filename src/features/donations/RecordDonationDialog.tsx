import { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button, type buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { DuplicateConfirmDialog } from '@/components/DuplicateConfirmDialog'
import { MemberPicker } from '@/features/members/MemberPicker'
import { DonationForm } from './DonationForm'
import { DonationDuplicateSummary } from './DonationDuplicateSummary'
import { useCreateDonation } from '@/hooks/useDonations'
import { useDuplicateConfirmation } from '@/hooks/useDuplicateConfirmation'
import { useProfile } from '@/contexts/ProfileContext'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { Member, Donation } from '@/types'
import type { DonationFormValues } from '@/schemas/donation.schema'
import type { VariantProps } from 'class-variance-authority'

export function RecordDonationDialog({
  variant,
  size = 'lg',
  className,
  label = 'Record Donation',
}: {
  variant?: VariantProps<typeof buttonVariants>['variant']
  size?: VariantProps<typeof buttonVariants>['size']
  className?: string
  label?: string
} = {}) {
  const [open, setOpen] = useState(false)
  const [member, setMember] = useState<Pick<Member, 'id' | 'member_name' | 'member_id'> | null>(null)
  const { profile } = useProfile()
  const { mutate, isPending } = useCreateDonation(profile!.id)
  const { duplicate, checkError, clear } = useDuplicateConfirmation<DonationFormValues, Donation>()

  function handleSubmit(values: DonationFormValues) {
    mutate(values, {
      onSuccess: () => {
        toast.success('Donation received — recorded successfully.')
        setOpen(false)
        setMember(null)
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
          setMember(null)
          clear()
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to save donation. Please try again.')),
      },
    )
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setMember(null)
        }}
      >
        <DialogTrigger asChild>
          <Button variant={variant} size={size} className={className}>
            <Plus className="size-4" /> {label}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record a Donation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Member</Label>
              <MemberPicker value={member} onChange={setMember} />
            </div>
            {member && <DonationForm memberId={member.id} onSubmit={handleSubmit} isSubmitting={isPending} />}
          </div>
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
