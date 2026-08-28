import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { DuplicateConfirmDialog } from '@/components/DuplicateConfirmDialog'
import { MemberPicker } from '@/features/members/MemberPicker'
import { DonationForm } from './DonationForm'
import { DonationDuplicateSummary } from './DonationDuplicateSummary'
import { useUpdateDonation } from '@/hooks/useDonations'
import { useDuplicateConfirmation } from '@/hooks/useDuplicateConfirmation'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { Member, Donation } from '@/types'
import type { DonationFormValues } from '@/schemas/donation.schema'
import type { DonationWithRelations } from '@/services/donations'

export function EditDonationDialog({ donation }: { donation: DonationWithRelations }) {
  const [open, setOpen] = useState(false)
  const [member, setMember] = useState<Pick<Member, 'id' | 'member_name' | 'member_id' | 'father_name'> | null>(
    donation.member && donation.member_id
      ? {
          id: donation.member_id,
          member_name: donation.member.member_name,
          member_id: donation.member.member_id,
          father_name: donation.member.father_name,
        }
      : null,
  )
  const { mutate, isPending } = useUpdateDonation()
  const { duplicate, checkError, clear } = useDuplicateConfirmation<DonationFormValues, Donation>()

  function handleSubmit(values: DonationFormValues) {
    mutate(
      { id: donation.id, values },
      {
        onSuccess: () => {
          toast.success('Donation updated.')
          setOpen(false)
          clear()
        },
        onError: (error) => {
          if (checkError(error, values)) return
          toast.error(getFriendlyErrorMessage(error, 'Unable to update this donation.'))
        },
      },
    )
  }

  function handleConfirmDuplicate() {
    if (!duplicate) return
    mutate(
      { id: donation.id, values: { ...duplicate.values, confirmDuplicate: true } },
      {
        onSuccess: () => {
          toast.success('Donation updated.')
          setOpen(false)
          clear()
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to update this donation.')),
      },
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Pencil className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Donation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Member</Label>
              <MemberPicker value={member} onChange={setMember} onClear={() => setMember(null)} clearLabel="Anonymous" />
            </div>
            <DonationForm
              key={member?.id ?? 'anonymous'}
              memberId={member?.id}
              defaultValues={{
                donor_name: donation.donor_name ?? '',
                donation_date: donation.donation_date,
                amount_inr: donation.amount_inr,
                donation_type: donation.donation_type,
                payment_method: donation.payment_method,
                transaction_reference: donation.transaction_reference ?? '',
                notes: donation.notes ?? '',
              }}
              onSubmit={handleSubmit}
              isSubmitting={isPending}
            />
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
