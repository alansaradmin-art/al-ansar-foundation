import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { ReceiptData } from './receiptData'

// Warm neutral/gold palette matching this app's own brand tokens
// (bg-gold/text-primary elsewhere in the UI) — no red anywhere, and no
// heavy borders/boxes; the banner carries the branding, so everything
// below it stays quiet and typographic.
const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 36, paddingHorizontal: 46, fontSize: 10, fontFamily: 'Helvetica', color: '#2b2620' },

  // Fixed height + objectFit: 'contain' — bounded so the banner can never
  // push the receipt onto a second page regardless of the configured
  // image's own aspect ratio, and 'contain' always shows the whole image
  // uncropped (centered, shrinking width only if the image's own aspect
  // ratio needs less than the full page width to stay under the height
  // cap) rather than cutting off any of its content the way 'cover'
  // would. (objectFit genuinely is a supported react-pdf style — verified
  // in @react-pdf/render's source, including that it clips correctly — the
  // earlier "banner not fitted" bug was this banner sitting inside a
  // header row with alignItems: 'center', which isn't the case anymore
  // now that it's the first, direct child of Page.)
  banner: { width: '100%', height: 90, objectFit: 'contain' },

  divider: { borderBottomWidth: 0.75, borderBottomColor: '#e3dcc8', marginTop: 18, marginBottom: 18 },

  title: { fontSize: 13, fontWeight: 700, textAlign: 'center', letterSpacing: 3, marginBottom: 20 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  metaLabel: { fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, color: '#a39a83' },
  metaValueLeft: { fontSize: 11, fontWeight: 700, marginTop: 3 },
  metaValueRight: { fontSize: 11, fontWeight: 700, marginTop: 3, textAlign: 'right' },

  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#a3813f', marginBottom: 10 },
  fieldRow: { flexDirection: 'row', marginBottom: 7 },
  fieldLabel: { width: 150, color: '#8a7d63' },
  fieldValue: { flex: 1, fontWeight: 500 },

  amountBox: {
    backgroundColor: '#faf6ea',
    borderWidth: 0.75,
    borderColor: '#e8dcb8',
    borderRadius: 6,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  amountLabel: { fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 1.5, color: '#a3813f' },
  amountValue: { fontSize: 20, fontWeight: 700, marginTop: 5 },
  amountWords: { fontSize: 8.5, color: '#8a7d63', marginTop: 5, textAlign: 'center' },

  thankYou: { textAlign: 'center', lineHeight: 1.55, color: '#4a4235', marginBottom: 20 },

  footer: { borderTopWidth: 0.75, borderTopColor: '#e3dcc8', paddingTop: 12, textAlign: 'center' },
  footerContact: { fontSize: 8.5, color: '#8a7d63' },
  footerNote: { fontSize: 7.5, color: '#b0a68f', marginTop: 4 },
})

/** The single source of truth for both the on-screen preview (<PDFViewer>
 * wraps this exact component, see ReceiptActions.tsx) and the exported PDF
 * (pdf(<ReceiptDocument .../>).toBlob(), see useDonationReceipt.ts) — the
 * two can never visually drift apart since there is only ever one
 * definition.
 *
 * No logo and no separate header — the banner is the very first thing on
 * the page, full stop. Nothing repeats "Al Ansar Foundation" above it
 * (not a logo, not a heading, not the contact-info line this used to
 * show up top) since the banner itself already carries the name/
 * branding; contact info still appears once, in the footer.
 *
 * Every section is sized to fit one A4 page for the normal range of
 * content (the banner's height is hard-capped above for exactly this
 * reason) — an extreme case like a very long remarks field can still
 * flow onto a second page (react-pdf paginates automatically rather than
 * clipping), which is expected/correct, not a bug.
 *
 * <Image> only renders when a banner URL is actually configured (blank
 * setting degrades to a clean layout with no banner at all, never a
 * broken one); useDonationReceipt.ts additionally retries once with
 * `stripImages` when even a *configured* URL fails to load (broken/
 * invalid image), so a bad setting can never block generation either. */
export function ReceiptDocument({ data, stripImages = false }: { data: ReceiptData; stripImages?: boolean }) {
  const showBanner = !stripImages && !!data.bannerUrl

  return (
    <Document title={`Receipt ${data.receiptNumber}`}>
      <Page size="A4" style={styles.page}>
        {showBanner && <Image src={data.bannerUrl} style={styles.banner} />}

        <View style={styles.divider} />
        <Text style={styles.title}>DONATION RECEIPT</Text>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>Receipt No.</Text>
            <Text style={styles.metaValueLeft}>{data.receiptNumber}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValueRight}>{data.donationDateFormatted}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Donor Information</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Donor Name</Text>
            <Text style={styles.fieldValue}>{data.donorName}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Member / Donor Type</Text>
            <Text style={styles.fieldValue}>
              {data.donorLabel}
              {data.memberDisplayId ? ` (${data.memberDisplayId})` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Donation Details</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Donation Type</Text>
            <Text style={styles.fieldValue}>{data.donationTypeLabel}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Payment Method</Text>
            <Text style={styles.fieldValue}>{data.paymentMethodLabel}</Text>
          </View>
          {data.transactionReference && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Transaction Reference</Text>
              <Text style={styles.fieldValue}>{data.transactionReference}</Text>
            </View>
          )}
          {data.notes && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Remarks</Text>
              <Text style={styles.fieldValue}>{data.notes}</Text>
            </View>
          )}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Received By</Text>
            <Text style={styles.fieldValue}>{data.receivedByLabel}</Text>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount Received</Text>
          <Text style={styles.amountValue}>{data.amountFormattedPdf}</Text>
          <Text style={styles.amountWords}>{data.amountInWords}</Text>
        </View>

        <Text style={styles.thankYou}>{data.footerText}</Text>

        <View style={styles.footer}>
          {data.contactInfo && <Text style={styles.footerContact}>{data.contactInfo}</Text>}
          <Text style={styles.footerNote}>This is a computer-generated receipt and does not require a signature.</Text>
        </View>
      </Page>
    </Document>
  )
}
