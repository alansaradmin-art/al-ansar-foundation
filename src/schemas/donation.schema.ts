import { z } from 'zod'

export const PAYMENT_METHODS = ['CASH', 'UPI', 'ONLINE', 'BANK_TRANSFER', 'OTHER'] as const

const REFERENCE_REQUIRED_METHODS = new Set(['UPI', 'ONLINE', 'BANK_TRANSFER'])

export const donationFormSchema = z
  .object({
    member_id: z.string().uuid('Select a member.'),
    donation_date: z.string().min(1, 'Donation date is required.'),
    amount_inr: z.coerce
      .number({ message: 'Enter a valid amount.' })
      .positive('Amount must be greater than ₹0.'),
    payment_method: z.enum(PAYMENT_METHODS),
    transaction_reference: z.string().trim().optional().or(z.literal('')),
    notes: z.string().trim().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (REFERENCE_REQUIRED_METHODS.has(data.payment_method) && !data.transaction_reference) {
      ctx.addIssue({
        code: 'custom',
        path: ['transaction_reference'],
        message: 'Transaction reference is required for UPI, Online, or Bank Transfer payments.',
      })
    }
  })

export type DonationFormValues = z.infer<typeof donationFormSchema>
