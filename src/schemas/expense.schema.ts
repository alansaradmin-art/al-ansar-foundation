import { z } from 'zod'
import { todayISO } from '@/lib/format'

export const expenseFormSchema = z.object({
  expense_date: z
    .string()
    .min(1, 'Expense date is required.')
    .refine((date) => date <= todayISO(), 'Expense date cannot be in the future.'),
  amount_inr: z.coerce.number({ message: 'Enter a valid amount.' }).positive('Amount must be greater than ₹0.'),
  fund_id: z.string().uuid('Select a fund.'),
  category_id: z.string().uuid('Select a category.'),
  beneficiary_id: z.string().uuid().optional(),
  paid_to: z.string().trim().optional().or(z.literal('')),
  purpose: z.string().trim().min(1, 'Purpose is required.'),
  description: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
})

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>

export const markPaidSchema = z
  .object({
    payment_method_id: z.string().uuid('Select a payment method.'),
    transaction_reference: z.string().trim().optional().or(z.literal('')),
    // Populated from the selected payment method's requires_reference flag
    // right before validation — see MarkPaidDialog.tsx. Not a form field.
    requiresReference: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.requiresReference && !data.transaction_reference) {
      ctx.addIssue({ code: 'custom', path: ['transaction_reference'], message: 'A transaction reference is required for this payment method.' })
    }
  })

export type MarkPaidFormValues = z.infer<typeof markPaidSchema>

export const cancelExpenseSchema = z.object({
  reason: z.string().trim().min(1, 'A cancellation reason is required.'),
})

export type CancelExpenseFormValues = z.infer<typeof cancelExpenseSchema>

export const beneficiaryFormSchema = z
  .object({
    is_confidential: z.boolean().default(false),
    display_name: z.string().trim().optional().or(z.literal('')),
    phone: z.string().trim().optional().or(z.literal('')),
    address: z.string().trim().optional().or(z.literal('')),
    notes: z.string().trim().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (!data.is_confidential && !data.display_name) {
      ctx.addIssue({ code: 'custom', path: ['display_name'], message: 'Name is required unless this beneficiary is confidential.' })
    }
  })

export type BeneficiaryFormValues = z.infer<typeof beneficiaryFormSchema>
