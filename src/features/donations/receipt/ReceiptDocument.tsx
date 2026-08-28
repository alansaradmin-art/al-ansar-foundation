import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { ReceiptData } from './receiptData'

// Warm neutral/gold palette matching this app's own brand tokens
// (bg-gold/text-primary elsewhere in the UI) — no red anywhere, and no
// heavy borders/boxes; the banner and logo carry the branding, so
// everything below them stays quiet and typographic.
const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 40, paddingHorizontal: 46, fontSize: 10, fontFamily: 'Helvetica', color: '#2b2620' },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  logo: { width: 46, height: 46, borderRadius: 23 },
  headerContact: { flex: 1, textAlign: 'right', fontSize: 8.5, color: '#8a7d63', lineHeight: 1.5 },

  // No fixed height and no 'objectFit' (not an actual react-pdf style —
  // silently ignored, which previously stretched/mis-fit the banner).
  // Full width, natural aspect ratio, no border/box around it — it reads
  // as the page's own masthead rather than a pasted-in image.
  banner: { width: '100%', marginTop: 14 },

  divider: { borderBottomWidth: 0.75, borderBottomColor: '#e3dcc8', marginTop: 22, marginBottom: 22 },

  title: { fontSize: 13, fontWeight: 700, textAlign: 'center', letterSpacing: 3, marginBottom: 24 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 26 },
  metaLabel: { fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, color: '#a39a83' },
  metaValueLeft: { fontSize: 11, fontWeight: 700, marginTop: 3 },
  metaValueRight: { fontSize: 11, fontWeight: 700, marginTop: 3, textAlign: 'right' },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#a3813f', marginBottom: 11 },
  fieldRow: { flexDirection: 'row', marginBottom: 8 },
  fieldLabel: { width: 150, color: '#8a7d63' },
  fieldValue: { flex: 1, fontWeight: 500 },

  amountBox: {
    backgroundColor: '#faf6ea',
    borderWidth: 0.75,
    borderColor: '#e8dcb8',
    borderRadius: 6,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 26,
  },
  amountLabel: { fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 1.5, color: '#a3813f' },
  amountValue: { fontSize: 22, fontWeight: 700, marginTop: 6 },
  amountWords: { fontSize: 8.5, color: '#8a7d63', marginTop: 6, textAlign: 'center' },

  thankYou: { textAlign: 'center', lineHeight: 1.6, color: '#4a4235', marginBottom: 30 },

  footer: { borderTopWidth: 0.75, borderTopColor: '#e3dcc8', paddingTop: 14, textAlign: 'center' },
  footerContact: { fontSize: 8.5, color: '#8a7d63' },
  footerNote: { fontSize: 7.5, color: '#b0a68f', marginTop: 5 },
})

/** The single source of truth for both the on-screen preview (<PDFViewer>
 * wraps this exact component, see ReceiptActions.tsx) and the exported PDF
 * (pdf(<ReceiptDocument .../>).toBlob(), see useDonationReceipt.ts) — the
 * two can never visually drift apart since there is only ever one
 * definition.
 *
 * Deliberately doesn't repeat "AL ANSAR FOUNDATION" as a heading — the
 * banner already carries the name/branding, and the logo (top-left) plus
 * banner (full-width, just below) are the only branding elements; the
 * footer only ever shows contact info, never the name again.
 *
 * <Image>s only render when a URL is actually configured (blank Logo/
 * Banner settings degrade to a clean layout with no logo/banner at all,
 * never a broken one); useDonationReceipt.ts additionally retries once
 * with `stripImages` when even a *configured* URL fails to load
 * (broken/invalid image), so a bad setting can never block generation
 * either. */
export function ReceiptDocument({ data, stripImages = false }: { data: ReceiptData; stripImages?: boolean }) {
  const showLogo = !stripImages && !!data.logoUrl
  const showBanner = !stripImages && !!data.bannerUrl

  return (
    <Document title={`Receipt ${data.receiptNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {showLogo && <Image src={data.logoUrl} style={styles.logo} />}
          {data.contactInfo && <Text style={styles.headerContact}>{data.contactInfo}</Text>}
        </View>

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
            <Text style={styles.fieldValue}>{data.recordedByName}</Text>
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
