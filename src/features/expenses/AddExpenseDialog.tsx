import { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ExpenseForm } from './ExpenseForm'
import { useCreateExpense } from '@/hooks/useExpenses'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { ExpenseFormValues } from '@/schemas/expense.schema'

export function AddExpenseDialog() {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useCreateExpense()

  function handleSubmit(values: ExpenseFormValues) {
    mutate(values, {
      onSuccess: () => {
        toast.success('Expense saved as Draft.')
        setOpen(false)
      },
      onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to save this expense. Please try again.')),
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="size-4" /> Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an Expense</DialogTitle>
        </DialogHeader>
        <ExpenseForm onSubmit={handleSubmit} isSubmitting={isPending} />
      </DialogContent>
    </Dialog>
  )
}
