import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { donationFormSchema, PAYMENT_METHODS, type DonationFormValues } from '@/schemas/donation.schema'

const PAYMENT_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  ONLINE: 'Online',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
}

const REFERENCE_REQUIRED = new Set(['UPI', 'ONLINE', 'BANK_TRANSFER'])

function todayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function DonationForm({
  memberId,
  onSubmit,
  isSubmitting,
}: {
  /** Omitted for an Admin-only anonymous donation (AnonymousDonationDialog) —
   * every other caller always supplies a real member id. */
  memberId?: string
  onSubmit: (values: DonationFormValues) => void
  isSubmitting: boolean
}) {
  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationFormSchema),
    defaultValues: {
      member_id: memberId,
      donation_date: todayISO(),
      amount_inr: 0,
      payment_method: 'CASH',
      transaction_reference: '',
      notes: '',
    },
  })

  const paymentMethod = form.watch('payment_method')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="donation_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Donation Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
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
