import { toast } from 'sonner'
import { Send, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EditExpenseDialog } from './EditExpenseDialog'
import { SignExpenseDialog } from './SignExpenseDialog'
import { OverrideApproveDialog } from './OverrideApproveDialog'
import { MarkPaidDialog } from './MarkPaidDialog'
import { CancelExpenseDialog } from './CancelExpenseDialog'
import { useSubmitExpense, useReopenExpense } from '@/hooks/useExpenses'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { ExpenseWithRelations } from '@/services/expenses'

/** The one place that decides which action(s) an expense's current status
 * allows — used identically by the mobile card and the desktop table row,
 * so the two can never drift out of sync with each other or with the
 * backend's own status-transition rules (api/expenses.ts). */
export function ExpenseActions({ expense }: { expense: ExpenseWithRelations }) {
  const { mutate: submit, isPending: isSubmitting } = useSubmitExpense()
  const { mutate: reopen, isPending: isReopening } = useReopenExpense()

  function handleSubmit() {
    submit(expense.id, {
      onSuccess: () => toast.success('Sent for committee approval.'),
      onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to submit this expense.')),
    })
  }

  function handleReopen() {
    reopen(expense.id, {
      onSuccess: () => toast.success('Reopened as Draft — edit and resubmit when ready.'),
      onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to reopen this expense.')),
    })
  }

  return (
    <>
      {expense.status === 'DRAFT' && (
        <>
          <Button variant="outline" size="sm" disabled={isSubmitting} onClick={handleSubmit}>
            <Send className="size-4" /> Submit
          </Button>
          <EditExpenseDialog expense={expense} />
        </>
      )}
      {expense.status === 'SUBMITTED' && (
        <>
          <SignExpenseDialog expense={expense} />
          <OverrideApproveDialog expenseId={expense.id} expenseNumber={expense.expense_number} />
        </>
      )}
      {expense.status === 'APPROVED' && <MarkPaidDialog expense={expense} />}
      {expense.status === 'REJECTED' && (
        <Button variant="outline" size="sm" disabled={isReopening} onClick={handleReopen}>
          <RotateCcw className="size-4" /> Reopen
        </Button>
      )}
      {expense.status !== 'CANCELLED' && <CancelExpenseDialog expenseId={expense.id} expenseNumber={expense.expense_number} />}
    </>
  )
}
