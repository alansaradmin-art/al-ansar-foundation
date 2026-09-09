import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useOverrideApproveExpense } from '@/hooks/useExpenses'
import { getFriendlyErrorMessage } from '@/lib/errors'

/** Admin-only emergency path — force-approves regardless of outstanding
 * committee signatures. Exists for the "not enough officers yet" gap
 * flagged in the Expense Management Plan §M; never silent about it — the
 * reason is mandatory and recorded as its own is_override row, distinct
 * from a real quorum signature everywhere it's shown. */
export function OverrideApproveDialog({ expenseId, expenseNumber }: { expenseId: string; expenseNumber: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { mutate, isPending } = useOverrideApproveExpense()

  function handleConfirm() {
    mutate(
      { id: expenseId, reason },
      {
        onSuccess: () => {
          toast.success('Expense approved via override.')
          setOpen(false)
          setReason('')
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to override approval.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-warning-foreground">
          <AlertTriangle className="size-4" /> Override
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override committee approval for {expenseNumber}?</DialogTitle>
          <DialogDescription>
            This approves the expense immediately, without waiting for the remaining committee signatures. Recorded
            distinctly in the approval history and audit log — never mistaken for a real quorum decision.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Reason</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!reason.trim() || isPending} onClick={handleConfirm}>
            {isPending ? 'Saving…' : 'Override & Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
