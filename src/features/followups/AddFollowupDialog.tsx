import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FollowupForm } from './FollowupForm'
import { useCreateFollowup } from '@/hooks/useFollowups'
import { useProfile } from '@/contexts/ProfileContext'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { Member } from '@/types'
import type { FollowupFormValues } from '@/schemas/followup.schema'

export function AddFollowupDialog({
  member,
  label = 'Add Follow-up',
  icon: Icon = Plus,
  variant = 'outline',
}: {
  member: Member
  label?: string
  icon?: LucideIcon
  variant?: 'outline' | 'default'
}) {
  const [open, setOpen] = useState(false)
  const { profile } = useProfile()
  const { mutate, isPending } = useCreateFollowup(profile!.manager_id!, profile!.id)

  function handleSubmit(values: FollowupFormValues) {
    mutate(values, {
      onSuccess: () => {
        toast.success('Follow-up saved.')
        setOpen(false)
      },
      onError: (error) => {
        toast.error(getFriendlyErrorMessage(error, 'Unable to save follow-up. Please try again.'))
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant={variant} className="flex-1">
          <Icon className="size-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record a Follow-up</DialogTitle>
        </DialogHeader>
        <FollowupForm member={member} onSubmit={handleSubmit} isSubmitting={isPending} />
      </DialogContent>
    </Dialog>
  )
}
