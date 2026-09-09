import { useState } from 'react'
import { toast } from 'sonner'
import { Gavel } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSignExpense } from '@/hooks/useExpenses'
import { getFriendlyErrorMessage } from '@/lib/errors'
import { FINANCIAL_ROLE_LABELS } from './financialRoleLabels'
import type { ExpenseWithRelations } from '@/services/expenses'
import type { FinancialRoleCode } from '@/types'

/** The roles still awaiting a signature this cycle — a role already
 * REJECTed would have already flipped the whole expense to Rejected
 * (status would no longer be SUBMITTED), so "still open" only ever needs
 * to exclude roles that already APPROVEd. */
function openRoles(expense: ExpenseWithRelations): FinancialRoleCode[] {
  const signed = new Set(
    expense.approvals.filter((a) => a.approval_cycle === expense.approval_cycle && a.action === 'APPROVE').map((a) => a.role_code),
  )
  return (expense.required_approval_roles ?? []).filter((role) => !signed.has(role))
}

export function SignExpenseDialog({ expense }: { expense: ExpenseWithRelations }) {
  const [open, setOpen] = useState(false)
  const roles = openRoles(expense)
  const [roleCode, setRoleCode] = useState<FinancialRoleCode | ''>(roles[0] ?? '')
  const [comment, setComment] = useState('')
  const { mutate, isPending } = useSignExpense()

  function handleDecision(decision: 'APPROVE' | 'REJECT') {
    if (!roleCode) {
      toast.error('Select which committee role you are signing as.')
      return
    }
    if (decision === 'REJECT' && !comment.trim()) {
      toast.error('A comment is required when rejecting.')
      return
    }
    mutate(
      { id: expense.id, roleCode, decision, comment: comment.trim() || undefined },
      {
        onSuccess: (updated) => {
          toast.success(
            decision === 'APPROVE'
              ? updated.status === 'APPROVED'
                ? 'Approved — committee quorum reached.'
                : 'Signature recorded — still awaiting other committee members.'
              : 'Expense rejected.',
          )
          setOpen(false)
          setComment('')
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to record your decision.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Gavel className="size-4" /> Sign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign {expense.expense_number}</DialogTitle>
          <DialogDescription>
            {roles.length} of {expense.required_approval_roles?.length ?? 0} committee signature(s) still needed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Signing as</Label>
            <Select value={roleCode} onValueChange={(v) => setRoleCode(v as FinancialRoleCode)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your committee role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {FINANCIAL_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Comment (required to reject)</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" disabled={isPending} onClick={() => handleDecision('REJECT')}>
            Reject
          </Button>
          <Button disabled={isPending} onClick={() => handleDecision('APPROVE')}>
            {isPending ? 'Saving…' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
