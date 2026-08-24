import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DuplicateConfirmDialog } from '@/components/DuplicateConfirmDialog'
import { FollowupForm } from './FollowupForm'
import { FollowupDuplicateSummary } from './FollowupDuplicateSummary'
import { useCreateFollowup } from '@/hooks/useFollowups'
import { useDuplicateConfirmation } from '@/hooks/useDuplicateConfirmation'
import { useProfile } from '@/contexts/ProfileContext'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { Member, MonthlyFollowup } from '@/types'
import type { FollowupFormValues } from '@/schemas/followup.schema'

export function AddFollowupDialog({
  member,
  label = 'Add Follow-up',
  icon: Icon = Plus,
  variant = 'outline',
  size = 'lg',
  className = 'flex-1',
}: {
  member: Member
  label?: string
  icon?: LucideIcon
  variant?: 'outline' | 'default'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const { profile } = useProfile()
  const { mutate, isPending } = useCreateFollowup(profile!.manager_id!, profile!.id)
  const { duplicate, checkError, clear } = useDuplicateConfirmation<FollowupFormValues, MonthlyFollowup>()

  function handleSubmit(values: FollowupFormValues) {
    mutate(values, {
      onSuccess: () => {
        toast.success('Follow-up saved.')
        setOpen(false)
        clear()
      },
      onError: (error) => {
        if (checkError(error, values)) return
        toast.error(getFriendlyErrorMessage(error, 'Unable to save follow-up. Please try again.'))
      },
    })
  }

  function handleConfirmDuplicate() {
    if (!duplicate) return
    mutate(
      { ...duplicate.values, confirmDuplicate: true },
      {
        onSuccess: () => {
          toast.success('Follow-up saved.')
          setOpen(false)
          clear()
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to save follow-up. Please try again.')),
      },
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size={size} variant={variant} className={className}>
            <Icon className="size-4" /> {label}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a Follow-up</DialogTitle>
          </DialogHeader>
          <FollowupForm member={member} onSubmit={handleSubmit} isSubmitting={isPending} />
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
