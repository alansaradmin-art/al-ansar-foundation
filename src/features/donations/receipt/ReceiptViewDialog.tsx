import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ReceiptActions } from './ReceiptActions'
import { ReceiptErrorBoundary } from './ReceiptErrorBoundary'
import { useDonationReceipt } from './useDonationReceipt'
import { formatReceiptNumber } from './receiptData'
import type { Donation, Member } from '@/types'

/** The row-action entry point — Admin Donations list, manager's own
 * Donations list, and Member 360's Donation History all render this same
 * component so "view this donation's receipt" is defined exactly once.
 * member is optional/nullable: absent or null means an anonymous donation
 * (donation.donor_name is used instead — see receiptData.ts). */
export function ReceiptViewDialog({
  donation,
  member,
  recordedByName,
}: {
  donation: Donation
  member?: Pick<Member, 'member_name' | 'member_id' | 'mobile_number' | 'mobile_country'> | null
  recordedByName: string
}) {
  const [open, setOpen] = useState(false)
  const receipt = useDonationReceipt(donation, member ?? null, recordedByName)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="View receipt">
          <Receipt className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Receipt {formatReceiptNumber(donation)}</DialogTitle>
        </DialogHeader>
        <ReceiptErrorBoundary
          fallback={
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Unable to generate this receipt right now. Please try again.
            </p>
          }
        >
          <ReceiptActions receipt={receipt} />
        </ReceiptErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}
