import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BeneficiaryPicker } from './BeneficiaryPicker'
import { useFunds } from '@/hooks/useFunds'
import { useExpenseCategories } from '@/hooks/useExpenseCategories'
import { expenseFormSchema, type ExpenseFormValues } from '@/schemas/expense.schema'
import { todayISO } from '@/lib/format'
import type { BeneficiaryOption } from '@/services/beneficiaries'

export function ExpenseForm({
  defaultValues,
  defaultBeneficiary = null,
  onSubmit,
  isSubmitting,
}: {
  defaultValues?: Partial<ExpenseFormValues>
  /** Only needed so an edit form can show the currently-attached
   * beneficiary's name — the id alone (in defaultValues) isn't enough to
   * render the picker's trigger label. */
  defaultBeneficiary?: BeneficiaryOption | null
  onSubmit: (values: ExpenseFormValues) => void
  isSubmitting: boolean
}) {
  const { data: funds = [] } = useFunds()
  const { data: categories = [] } = useExpenseCategories()

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      expense_date: todayISO(),
      amount_inr: 0,
      fund_id: '',
      category_id: '',
      paid_to: '',
      purpose: '',
      description: '',
      notes: '',
      ...defaultValues,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="expense_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expense Date</FormLabel>
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
          name="fund_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fund</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a fund" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.name}
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
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label>Beneficiary (optional)</Label>
          <BeneficiaryPicker
            value={defaultBeneficiary}
            onChange={(beneficiary) => form.setValue('beneficiary_id', beneficiary?.id, { shouldDirty: true })}
          />
        </div>

        <FormField
          control={form.control}
          name="paid_to"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Paid To (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Vendor / payee name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose</FormLabel>
              <FormControl>
                <Input placeholder="Short summary of this expense" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internal Notes (optional)</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save as Draft'}
        </Button>
      </form>
    </Form>
  )
}
