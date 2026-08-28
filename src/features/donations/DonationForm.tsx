import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { donationFormSchema, DONATION_TYPES, PAYMENT_METHODS, type DonationFormValues } from '@/schemas/donation.schema'
import { todayISO } from '@/lib/format'

const PAYMENT_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  ONLINE: 'Online',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
}

const DONATION_TYPE_LABELS: Record<(typeof DONATION_TYPES)[number], string> = {
  ZAKAT: 'Zakat',
  SADAQAH: 'Sadaqah/Sadka',
  FITRA: 'Fitra',
  GENERAL: 'General Donation',
  OTHER: 'Other',
}

const REFERENCE_REQUIRED = new Set(['UPI', 'ONLINE', 'BANK_TRANSFER'])

export function DonationForm({
  memberId,
  defaultValues,
  onSubmit,
  isSubmitting,
}: {
  /** Omitted for an Admin-only anonymous donation (AnonymousDonationDialog) —
   * every other caller always supplies a real member id. */
  memberId?: string
  /** Pre-fills the form beyond the create defaults below — used by
   * EditDonationDialog to seed the existing donation's values. Every other
   * caller omits this, so their behavior is unchanged. */
  defaultValues?: Partial<Omit<DonationFormValues, 'member_id'>>
  onSubmit: (values: DonationFormValues) => void
  isSubmitting: boolean
}) {
  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationFormSchema),
    defaultValues: {
      member_id: memberId,
      donor_name: '',
      donation_date: todayISO(),
      amount_inr: 0,
      donation_type: 'SADAQAH',
      payment_method: 'CASH',
      transaction_reference: '',
      notes: '',
      ...defaultValues,
    },
  })

  const paymentMethod = form.watch('payment_method')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Only rendered without a memberId — a real member's name/id
         * already comes from the member record itself, so this is purely
         * the "unknown donor" identity capture (feeds the receipt's Donor
         * Name field; see src/features/donations/receipt/). Optional, per
         * the request: an unknown donor's name is never required either. */}
        {!memberId && (
          <FormField
            control={form.control}
            name="donor_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Donor Name (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="If known" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="donation_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Donation Date</FormLabel>
              <FormControl>
                <Input type="date" max={todayISO()} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount_inr"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    ₹
                  </span>
                  <Input type="number" inputMode="decimal" min="0.01" step="0.01" className="pl-7" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="donation_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Donation Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DONATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DONATION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="payment_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_LABELS[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {REFERENCE_REQUIRED.has(paymentMethod) && (
          <FormField
            control={form.control}
            name="transaction_reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UPI / Transaction Reference Number</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Donation'}
        </Button>
      </form>
    </Form>
  )
}
