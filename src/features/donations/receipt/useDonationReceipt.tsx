import { useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { pdf } from '@react-pdf/renderer'
import { ReceiptDocument } from './ReceiptDocument'
import { buildReceiptData, buildWhatsAppReceiptMessage, type ReceiptData } from './receiptData'
import { useReceiptBranding } from './useReceiptBranding'
import { hasUsableWhatsAppNumber, whatsappHref } from '@/lib/contact'
import { logReceiptEvent, type ReceiptEvent } from '@/services/donations'
import type { Donation, Member } from '@/types'

/** Same Blob -> URL.createObjectURL -> temporary <a download> -> revoke
 * sequence src/lib/csv.ts's downloadCsv already establishes for CSV
 * exports — just a different MIME type/extension. */
function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export interface UseDonationReceiptResult {
  data: ReceiptData
  /** Builds the PDF blob — retries once with images stripped if a
   * configured logo/banner URL is invalid/unreachable, so a bad image can
   * never actually block generation, only a genuinely broken build can
   * (and even then, the donation itself was already saved before this
   * could ever run). */
  buildPdfBlob: () => Promise<Blob>
  downloadReceipt: () => Promise<void>
  printReceipt: () => Promise<void>
  /** Never claims delivery — every path here only ever *opens* something
   * (the OS share sheet, or WhatsApp itself) for the manager to review and
   * manually press Send inside. */
  shareOnWhatsApp: () => Promise<{ method: 'share' | 'whatsapp-known' | 'whatsapp-manual' }>
  logViewed: () => void
}

/** The reusable receipt behavior — identical from the post-save success
 * screen, the admin Donations list, and Member 360's Donation History (see
 * ReceiptActions.tsx, the shared button row every one of those uses). */
export function useDonationReceipt(
  donation: Donation,
  member: Pick<Member, 'member_name' | 'member_id' | 'mobile_number' | 'mobile_country'> | null,
): UseDonationReceiptResult {
  const { getToken } = useAuth()
  const { data: branding } = useReceiptBranding()
  const hasLoggedGenerated = useRef(false)

  const data = useMemo(
    () =>
      buildReceiptData(donation, member, branding ?? { bannerUrl: '', footerText: '', contactInfo: '', receivedByLabel: '' }),
    [donation, member, branding],
  )

  // Fire-and-forget — a lost audit-log write must never surface as a user-
  // facing error for an action that otherwise succeeded fine.
  const log = useCallback(
    (event: ReceiptEvent) => {
      void logReceiptEvent(getToken, donation.id, event).catch(() => {})
    },
    [getToken, donation.id],
  )

  const buildPdfBlob = useCallback(async () => {
    let blob: Blob
    try {
      blob = await pdf(<ReceiptDocument data={data} />).toBlob()
    } catch {
      // Retry once, text-only — covers a broken/unreachable logo or
      // banner URL without ever failing generation outright.
      blob = await pdf(<ReceiptDocument data={data} stripImages />).toBlob()
    }
    if (!hasLoggedGenerated.current) {
      hasLoggedGenerated.current = true
      log('generated')
    }
    return blob
  }, [data, log])

  const downloadReceipt = useCallback(async () => {
    const blob = await buildPdfBlob()
    downloadBlob(`Receipt-${data.receiptNumber}.pdf`, blob)
    log('downloaded')
  }, [buildPdfBlob, data.receiptNumber, log])

  const printReceipt = useCallback(async () => {
    const blob = await buildPdfBlob()
    // Opens the browser's own native PDF viewer, which every desktop and
    // mobile browser already has a print action for — avoids print-CSS
    // entirely, and is far more consistent across devices than it would be.
    window.open(URL.createObjectURL(blob), '_blank')
  }, [buildPdfBlob])

  const shareOnWhatsApp = useCallback(async (): Promise<{ method: 'share' | 'whatsapp-known' | 'whatsapp-manual' }> => {
    const message = buildWhatsAppReceiptMessage(data)
    const blob = await buildPdfBlob()
    const file = new File([blob], `Receipt-${data.receiptNumber}.pdf`, { type: 'application/pdf' })

    // Web Share API with a file attachment — the one path where "attach
    // the real PDF" and "let the manager pick any recipient, known or
    // unknown" both genuinely work, via the OS's own native share sheet.
    // Not universally supported (most reliable on mobile Chrome/Safari;
    // desktop browsers largely don't support sharing files at all), so
    // every other path below falls back to download + open WhatsApp.
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({ files: [file], text: message })
        log('shared')
        return { method: 'share' }
      } catch {
        // User cancelled the share sheet, or the browser refused mid-flow
        // — fall through to the manual download + wa.me path below rather
        // than treating this as a hard failure.
      }
    }

    // No file-sharing support: fall back to the §7 manual-attach flow —
    // download the PDF, then open WhatsApp itself with the message
    // pre-filled, for the manager to attach the just-downloaded file to
    // and press Send themselves.
    downloadBlob(`Receipt-${data.receiptNumber}.pdf`, blob)

    const knownNumber = member ? hasUsableWhatsAppNumber(member.mobile_number, member.mobile_country) : false
    const url = knownNumber
      ? whatsappHref(member!.mobile_number!, member!.mobile_country, message)
      : `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url ?? `https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noreferrer')
    log('shared')
    return { method: knownNumber ? 'whatsapp-known' : 'whatsapp-manual' }
  }, [buildPdfBlob, data, log, member])

  const logViewed = useCallback(() => log('viewed'), [log])

  return { data, buildPdfBlob, downloadReceipt, printReceipt, shareOnWhatsApp, logViewed }
}
