import { z } from 'zod'
import { todayISO } from '@/lib/format'

export const PAYMENT_METHODS = ['CASH', 'UPI', 'ONLINE', 'BANK_TRANSFER', 'OTHER'] as const
export const DONATION_TYPES = ['ZAKAT', 'SADAQAH', 'FITRA', 'GENERAL', 'OTHER'] as const

const REFERENCE_REQUIRED_METHODS = new Set(['UPI', 'ONLINE', 'BANK_TRANSFER'])

export const donationFormSchema = z
  .object({
    // Absent entirely for an Admin-only anonymous donation (see
    // AnonymousDonationDialog.tsx) — every other donation-entry dialog
    // always supplies a real memberId prop, so this stays effectively
    // required for them in practice. The server is the real gate on who
    // may omit it (api/donations.ts).
    member_id: z.string().uuid('Select a member.').optional(),
    donation_date: z
      .string()
      .min(1, 'Donation date is required.')
      .refine((date) => date <= todayISO(), 'Donation date cannot be in the future.'),
    amount_inr: z.coerce
      .number({ message: 'Enter a valid amount.' })
      .positive('Amount must be greater than ₹0.'),
    donation_type: z.enum(DONATION_TYPES, { message: 'Select a donation type.' }),
    payment_method: z.enum(PAYMENT_METHODS),
    transaction_reference: z.string().trim().optional().or(z.literal('')),
    notes: z.string().trim().optional().or(z.literal('')),
    // Not a visible form field — set only when resubmitting after the
    // user confirmed a possible-duplicate warning (see
    // useDuplicateConfirmation), so the server skips its soft check.
    confirmDuplicate: z.boolean().optional(),
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
