import { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MemberPicker } from '@/features/members/MemberPicker'
import { DonationForm } from './DonationForm'
import { useCreateDonation } from '@/hooks/useDonations'
import { useProfile } from '@/contexts/ProfileContext'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { Member } from '@/types'
import type { DonationFormValues } from '@/schemas/donation.schema'

export function RecordDonationDialog() {
  const [open, setOpen] = useState(false)
  const [member, setMember] = useState<Pick<Member, 'id' | 'member_name' | 'member_id'> | null>(null)
  const { profile } = useProfile()
  const { mutate, isPending } = useCreateDonation(profile!.id)

  function handleSubmit(values: DonationFormValues) {
    mutate(values, {
      onSuccess: () => {
        toast.success('Donation received — recorded successfully.')
        setOpen(false)
        setMember(null)
      },
      onError: (error) => {
        toast.error(getFriendlyErrorMessage(error, 'Unable to save donation. Please try again.'))
      },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setMember(null)
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="size-4" /> Record Donation
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
  )
}
