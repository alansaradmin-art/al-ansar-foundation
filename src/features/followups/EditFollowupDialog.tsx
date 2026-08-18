import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DuplicateConfirmDialog } from '@/components/DuplicateConfirmDialog'
import { FollowupForm } from './FollowupForm'
import { FollowupDuplicateSummary } from './FollowupDuplicateSummary'
import { useUpdateFollowup } from '@/hooks/useFollowups'
import { useDuplicateConfirmation } from '@/hooks/useDuplicateConfirmation'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { Member, MonthlyFollowup } from '@/types'
import type { FollowupFormValues } from '@/schemas/followup.schema'

/** Only ever rendered for a STARTED/IN_PROGRESS row by the caller — the
 * server also enforces this (api/followups.ts's ?action=update rejects a
 * finished outcome), this component just doesn't add its own duplicate
 * check for something the API already guards. */
export function EditFollowupDialog({ followup, member }: { followup: MonthlyFollowup; member: Member }) {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useUpdateFollowup()
  const { duplicate, checkError, clear } = useDuplicateConfirmation<FollowupFormValues, MonthlyFollowup>()

  function handleSubmit(values: FollowupFormValues) {
    mutate(
      { id: followup.id, values },
      {
        onSuccess: () => {
          toast.success('Follow-up updated.')
          setOpen(false)
          clear()
        },
        onError: (error) => {
          if (checkError(error, values)) return
          toast.error(getFriendlyErrorMessage(error, 'Unable to update this follow-up.'))
        },
      },
    )
  }

  function handleConfirmDuplicate() {
    if (!duplicate) return
    mutate(
      { id: followup.id, values: { ...duplicate.values, confirmDuplicate: true } },
      {
        onSuccess: () => {
          toast.success('Follow-up updated.')
          setOpen(false)
          clear()
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to update this follow-up.')),
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Follow-up</DialogTitle>
          </DialogHeader>
          <FollowupForm
            member={member}
            disableDateEdit
            defaultValues={{
              follow_up_date: followup.follow_up_date,
              follow_up_status: followup.follow_up_status,
              follow_up_method: followup.follow_up_method ?? undefined,
              contacted_person_type: followup.contacted_person_type ?? undefined,
              contacted_person_name: followup.contacted_person_name ?? '',
              contacted_person_phone: followup.contacted_person_phone ?? '',
              contacted_person_relationship: followup.contacted_person_relationship ?? '',
              remarks: followup.remarks ?? '',
              next_follow_up_date: followup.next_follow_up_date ?? '',
            }}
            onSubmit={handleSubmit}
            isSubmitting={isPending}
          />
        </DialogContent>
      </Dialog>

      {duplicate && (
        <DuplicateConfirmDialog
          open
          onOpenChange={(next) => !next && clear()}
          message="A follow-up for this member on this date with this status is already recorded:"
          summary={<FollowupDuplicateSummary followup={duplicate.existing} />}
          onConfirm={handleConfirmDuplicate}
          isConfirming={isPending}
        />
      )}
    </>
  )
}
