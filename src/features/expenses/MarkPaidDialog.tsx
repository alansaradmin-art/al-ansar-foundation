import { useState } from 'react'
import { toast } from 'sonner'
import { CircleDollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'
import { useMarkExpensePaid } from '@/hooks/useExpenses'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { ExpenseWithRelations } from '@/services/expenses'

/** Only ever rendered for a DRAFT expense — see EditExpenseDialog's note;
 * the server enforces the real gate (api/expenses.ts's markPaid action). */
export function MarkPaidDialog({ expense }: { expense: ExpenseWithRelations }) {
  const [open, setOpen] = useState(false)
  const [methodId, setMethodId] = useState('')
  const [reference, setReference] = useState('')
  const { data: methods = [] } = usePaymentMethods()
  const { mutate, isPending } = useMarkExpensePaid()

  const selectedMethod = methods.find((m) => m.id === methodId)

  function handleSubmit() {
    if (!methodId) {
      toast.error('Select a payment method.')
      return
    }
    if (selectedMethod?.requires_reference && !reference.trim()) {
      toast.error('A transaction reference is required for this payment method.')
      return
    }
    mutate(
      { id: expense.id, paymentMethodId: methodId, transactionReference: reference.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Expense marked as Paid.')
          setOpen(false)
          setMethodId('')
          setReference('')
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to mark this expense as paid.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CircleDollarSign className="size-4" /> Mark Paid
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark {expense.expense_number} as Paid</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={methodId} onValueChange={setMethodId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a payment method" />
              </SelectTrigger>
              <SelectContent>
                {methods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedMethod?.requires_reference && (
            <div className="space-y-2">
              <Label>Transaction Reference</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving…' : 'Mark Paid'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
