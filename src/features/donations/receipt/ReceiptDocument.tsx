import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { ReceiptData } from './receiptData'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#241f19' },
  header: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 64, height: 64, marginBottom: 8, borderRadius: 32 },
  foundationName: { fontSize: 18, fontWeight: 700, letterSpacing: 1 },
  foundationSubtitle: { fontSize: 10, color: '#6b6155', marginTop: 2 },
  banner: { width: '100%', height: 90, marginTop: 12, objectFit: 'cover', borderRadius: 4 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#d8cfae', marginVertical: 16 },
  title: { fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 16, letterSpacing: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  sectionLabel: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8a7d63', marginBottom: 6 },
  section: { marginBottom: 16 },
  fieldRow: { flexDirection: 'row', marginBottom: 4 },
  fieldLabel: { width: 140, color: '#6b6155' },
  fieldValue: { flex: 1, fontWeight: 500 },
  amountBox: {
    borderWidth: 1,
    borderColor: '#241f19',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  amountLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: '#6b6155' },
  amountValue: { fontSize: 20, fontWeight: 700, marginTop: 4 },
  thankYou: { textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 1.5, color: '#3f382c' },
  footer: { borderTopWidth: 1, borderTopColor: '#d8cfae', paddingTop: 12, textAlign: 'center' },
  footerName: { fontWeight: 700, marginBottom: 2 },
  footerContact: { color: '#6b6155', fontSize: 9 },
})

/** The single source of truth for both the on-screen preview (<PDFViewer>
 * wraps this exact component, see ReceiptActions.tsx) and the exported PDF
 * (pdf(<ReceiptDocument .../>).toBlob(), see useDonationReceipt.ts) — the
 * two can never visually drift apart since there is only ever one
 * definition. <Image>s only render when a URL is actually configured
 * (blank Logo/Banner settings degrade to a clean text-only header, never a
 * broken layout); useDonationReceipt.ts additionally retries once with
 * `stripImages` when even a *configured* URL fails to load (broken/invalid
 * image), so a bad setting can never block generation either. */
export function ReceiptDocument({ data, stripImages = false }: { data: ReceiptData; stripImages?: boolean }) {
  const showLogo = !stripImages && !!data.logoUrl
  const showBanner = !stripImages && !!data.bannerUrl

  return (
    <Document title={`Receipt ${data.receiptNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {showLogo && <Image src={data.logoUrl} style={styles.logo} />}
          <Text style={styles.foundationName}>AL ANSAR FOUNDATION</Text>
          {data.contactInfo && <Text style={styles.foundationSubtitle}>{data.contactInfo}</Text>}
          {showBanner && <Image src={data.bannerUrl} style={styles.banner} />}
        </View>

        <View style={styles.divider} />
        <Text style={styles.title}>DONATION RECEIPT</Text>

        <View style={styles.metaRow}>
          <Text>
            <Text style={{ color: '#6b6155' }}>Receipt No: </Text>
            {data.receiptNumber}
          </Text>
          <Text>
            <Text style={{ color: '#6b6155' }}>Date: </Text>
            {data.donationDateFormatted}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Donor Information</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Donor Name</Text>
            <Text style={styles.fieldValue}>{data.donorName}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Member</Text>
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
          <Text style={styles.amountValue}>{data.amountFormatted}</Text>
        </View>

        <Text style={styles.thankYou}>{data.footerText}</Text>

        <View style={styles.footer}>
          <Text style={styles.footerName}>Al Ansar Foundation</Text>
          {data.contactInfo && <Text style={styles.footerContact}>{data.contactInfo}</Text>}
        </View>
      </Page>
    </Document>
  )
}
