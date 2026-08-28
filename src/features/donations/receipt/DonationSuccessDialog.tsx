import { CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ReceiptActions } from './ReceiptActions'
import { ReceiptErrorBoundary } from './ReceiptErrorBoundary'
import { useDonationReceipt } from './useDonationReceipt'
import { formatReceiptNumber } from './receiptData'
import type { Donation, Member } from '@/types'

/** Add Donation -> Save -> [this] -> the manager can immediately View/
 * Download/Print/WhatsApp the receipt. Only ever mounted by its caller
 * once a real Donation exists (see AddDonationDialog.tsx etc.) — never
 * handles a null donation itself, so useDonationReceipt can always be
 * called unconditionally at the top, same as every other hook here. */
export function DonationSuccessDialog({
  donation,
  member,
  open,
  onOpenChange,
}: {
  donation: Donation
  member?: Pick<Member, 'member_name' | 'member_id' | 'mobile_number' | 'mobile_country'> | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const receipt = useDonationReceipt(donation, member ?? null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" />
            <DialogTitle>Donation Added Successfully</DialogTitle>
          </div>
          <DialogDescription>Receipt No: {formatReceiptNumber(donation)}</DialogDescription>
        </DialogHeader>
        <ReceiptErrorBoundary
          fallback={
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Donation saved successfully, but receipt generation failed. Please try generating the receipt again from
              Donation History.
            </p>
          }
        >
          <ReceiptActions receipt={receipt} />
        </ReceiptErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}
