import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ManagerForm } from './ManagerForm'
import { useCreateManager, useUpdateManager } from '@/hooks/useManagers'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { Manager } from '@/types'
import type { ManagerFormValues } from '@/schemas/manager.schema'

/** A legacy manager whose phone predates the country picker (see migration
 * 0035_phone_country_split.sql's backfill notes) may have phone_country
 * still null — the form requires a country to save, so this just leaves
 * the picker unset (forcing the admin to choose one) rather than passing
 * an invalid null default through. */
function managerToFormValues(manager: Manager): Partial<ManagerFormValues> {
  return {
    full_name: manager.full_name,
    phone: manager.phone,
    phone_country: manager.phone_country ?? undefined,
    email: manager.email,
    status: manager.status,
  }
}

export function ManagerFormDialog({ manager }: { manager?: Manager }) {
  const [open, setOpen] = useState(false)
  const isEdit = !!manager
  const createMutation = useCreateManager()
  const updateMutation = useUpdateManager(manager?.id ?? '')
  const mutation = isEdit ? updateMutation : createMutation

  function handleSubmit(values: ManagerFormValues) {
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Manager updated.' : 'Manager added.')
        setOpen(false)
      },
      onError: (error) => {
        toast.error(getFriendlyErrorMessage(error, 'Unable to save manager. Please try again.'))
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
            <Plus className="size-4" /> Add Manager
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Manager' : 'Add Manager'}</DialogTitle>
        </DialogHeader>
        <ManagerForm
          defaultValues={manager ? managerToFormValues(manager) : undefined}
          onSubmit={handleSubmit}
          isSubmitting={mutation.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
