import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MemberPicker } from '@/features/members/MemberPicker'
import { DonationForm } from './DonationForm'
import { useUpdateDonation } from '@/hooks/useDonations'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { Member } from '@/types'
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

  function handleSubmit(values: DonationFormValues) {
    mutate(
      { id: donation.id, values },
      {
        onSuccess: () => {
          toast.success('Donation updated.')
          setOpen(false)
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to update this donation.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
  )
}
