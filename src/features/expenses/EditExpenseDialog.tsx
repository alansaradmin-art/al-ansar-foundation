import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ExpenseForm } from './ExpenseForm'
import { useUpdateExpense } from '@/hooks/useExpenses'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { ExpenseFormValues } from '@/schemas/expense.schema'
import type { ExpenseWithRelations } from '@/services/expenses'

/** Only ever rendered by the list page for a DRAFT expense — the server
 * rejects an edit on anything else regardless (api/expenses.ts), this just
 * keeps the button from appearing where it could never succeed. */
export function EditExpenseDialog({ expense }: { expense: ExpenseWithRelations }) {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useUpdateExpense()

  function handleSubmit(values: ExpenseFormValues) {
    mutate(
      { id: expense.id, values },
      {
        onSuccess: () => {
          toast.success('Expense updated.')
          setOpen(false)
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to update this expense. Please try again.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Edit expense">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Expense — {expense.expense_number}</DialogTitle>
        </DialogHeader>
        <ExpenseForm
          defaultValues={{
            expense_date: expense.expense_date,
            amount_inr: expense.amount_inr,
            fund_id: expense.fund_id,
            category_id: expense.category_id,
            beneficiary_id: expense.beneficiary_id ?? undefined,
            paid_to: expense.paid_to ?? '',
            purpose: expense.purpose,
            description: expense.description ?? '',
            notes: expense.notes ?? '',
          }}
          defaultBeneficiary={
            expense.beneficiary
              ? { id: expense.beneficiary.id, display_name: expense.beneficiary.display_name, phone: null, is_confidential: expense.beneficiary.is_confidential }
              : null
          }
          onSubmit={handleSubmit}
          isSubmitting={isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
