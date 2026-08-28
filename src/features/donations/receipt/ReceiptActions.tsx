import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PDFViewer } from '@react-pdf/renderer'
import { Download, Printer, MessageCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReceiptDocument } from './ReceiptDocument'
import type { UseDonationReceiptResult } from './useDonationReceipt'

type Action = 'download' | 'print' | 'whatsapp'

/** The "View / Download PDF / Print / Send on WhatsApp" surface — defined
 * once here, reused by both ReceiptViewDialog (row actions) and
 * DonationSuccessDialog (post-save), so the buttons can't drift between
 * the two. "View" has no separate button — the live preview below already
 * is the view, logged once on mount. */
export function ReceiptActions({ receipt }: { receipt: UseDonationReceiptResult }) {
  const [working, setWorking] = useState<Action | null>(null)

  useEffect(() => {
    receipt.logViewed()
    // Only once per time this is actually shown — receipt.logViewed is a
    // stable useCallback, and re-running on every donation/data change
    // would double-count a single open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handle(action: Action) {
    setWorking(action)
    try {
      if (action === 'download') await receipt.downloadReceipt()
      if (action === 'print') await receipt.printReceipt()
      if (action === 'whatsapp') {
        const { method } = await receipt.shareOnWhatsApp()
        if (method !== 'share') {
          toast.info('Receipt downloaded and WhatsApp opened — attach the file and press Send.')
        }
      }
    } catch {
      toast.error('Unable to generate the receipt. Please try again.')
    } finally {
      setWorking(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Iframe-based — reliable on desktop, patchier on some mobile
       * browsers. Never the only way to see the receipt: Download/Print
       * below always work regardless, so a viewer that doesn't render
       * inline here is never a dead end. */}
      <div className="overflow-hidden rounded-lg border bg-muted/30">
        <PDFViewer width="100%" height={420} showToolbar={false}>
          <ReceiptDocument data={receipt.data} />
        </PDFViewer>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="flex-1" onClick={() => handle('download')} disabled={working !== null}>
          {working === 'download' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Download PDF
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => handle('print')} disabled={working !== null}>
          {working === 'print' ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
          Print
        </Button>
        <Button className="flex-1" onClick={() => handle('whatsapp')} disabled={working !== null}>
          {working === 'whatsapp' ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
          Send on WhatsApp
        </Button>
      </div>
    </div>
  )
}
