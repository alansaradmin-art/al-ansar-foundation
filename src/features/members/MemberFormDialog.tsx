import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MemberForm } from './MemberForm'
import { useCreateMember, useUpdateMember } from '@/hooks/useMembers'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { Member } from '@/types'
import type { MemberFormValues } from '@/schemas/member.schema'

function memberToFormValues(member: Member): Partial<MemberFormValues> {
  return {
    member_name: member.member_name,
    father_name: member.father_name ?? '',
    mobile_number: member.mobile_number ?? '',
    address: member.address ?? '',
    added_by_type: member.added_by_type ?? undefined,
    added_by_id: member.added_by_id ?? undefined,
    added_by_name: member.added_by_name ?? '',
    added_by_phone: member.added_by_phone ?? '',
    reference_contact_type: member.reference_contact_type ?? undefined,
    reference_contact_id: member.reference_contact_id ?? undefined,
    reference_contact_name: member.reference_contact_name ?? '',
    reference_contact_phone: member.reference_contact_phone ?? '',
    reference_contact_relationship: member.reference_contact_relationship ?? '',
    assigned_manager_id: member.assigned_manager_id ?? undefined,
    status: member.status,
  }
}

export function MemberFormDialog({ member }: { member?: Member }) {
  const [open, setOpen] = useState(false)
  const isEdit = !!member
  const createMutation = useCreateMember()
  const updateMutation = useUpdateMember(member?.id ?? '')
  const mutation = isEdit ? updateMutation : createMutation

  function handleSubmit(values: MemberFormValues) {
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Member updated.' : 'Member added.')
        setOpen(false)
      },
      onError: (error) => {
        toast.error(getFriendlyErrorMessage(error, 'Unable to save member. Please try again.'))
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            <Pencil className="size-4" /> Edit
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" /> Add Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Member' : 'Add Member'}</DialogTitle>
        </DialogHeader>
        <MemberForm
          defaultValues={member ? memberToFormValues(member) : undefined}
          existingMemberId={member?.member_id}
          onSubmit={handleSubmit}
          isSubmitting={mutation.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
