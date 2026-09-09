import { useState } from 'react'
import { toast } from 'sonner'
import { Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useCancelExpense } from '@/hooks/useExpenses'
import { getFriendlyErrorMessage } from '@/lib/errors'

/** Cancel, never delete — matches the plan's §K rule (no DELETE endpoint
 * exists for expenses at all). Valid from Draft or Paid. */
export function CancelExpenseDialog({ expenseId, expenseNumber }: { expenseId: string; expenseNumber: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { mutate, isPending } = useCancelExpense()

  function handleConfirm() {
    mutate(
      { id: expenseId, reason },
      {
        onSuccess: () => {
          toast.success('Expense cancelled.')
          setOpen(false)
          setReason('')
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to cancel this expense.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Cancel expense">
          <Ban className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel {expenseNumber}?</DialogTitle>
          <DialogDescription>
            This is kept on file for audit purposes, not deleted. Please note why this expense is being cancelled.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Reason</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep Expense
          </Button>
          <Button variant="destructive" disabled={!reason.trim() || isPending} onClick={handleConfirm}>
            {isPending ? 'Cancelling…' : 'Cancel Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
