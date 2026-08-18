import { z } from 'zod'
import { optionalPhoneSchema } from './common.schema'

export const FOLLOW_UP_STATUSES = ['NOT_STARTED', 'COMPLETED', 'NOT_INTERESTED', 'CALLBACK_REQUIRED', 'OTHER'] as const
export const FOLLOW_UP_METHODS = ['PHONE', 'WHATSAPP', 'IN_PERSON', 'OTHER'] as const
export const CONTACTED_PERSON_TYPES = ['MEMBER', 'ADDED_BY', 'REFERENCE_CONTACT', 'OTHER'] as const

/** Local-machine "today" as YYYY-MM-DD — used both as the form's default
 * date and to reject a future date client-side. The server (api/followups.ts)
 * is the authoritative check and uses IST explicitly instead, since it can't
 * rely on any particular caller's clock/timezone. */
export function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export const followupFormSchema = z
  .object({
    member_id: z.string().uuid('Select a member.'),
    follow_up_date: z
      .string()
      .min(1, 'Follow-up date is required.')
      .refine((date) => date <= todayISO(), 'Follow-up date cannot be in the future.'),
    follow_up_status: z.enum(FOLLOW_UP_STATUSES),
    follow_up_method: z.enum(FOLLOW_UP_METHODS).optional(),
    contacted_person_type: z.enum(CONTACTED_PERSON_TYPES),
    contacted_person_name: z.string().trim().optional().or(z.literal('')),
    contacted_person_phone: optionalPhoneSchema,
    contacted_person_relationship: z.string().trim().optional().or(z.literal('')),
    remarks: z.string().trim().optional().or(z.literal('')),
    // Not a visible form field — set only when resubmitting after the
    // user confirmed a possible-duplicate warning (see
    // useDuplicateConfirmation), so the server skips its soft check.
    confirmDuplicate: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.contacted_person_type === 'OTHER' && !data.contacted_person_name) {
      ctx.addIssue({ code: 'custom', path: ['contacted_person_name'], message: 'Enter the contact’s name.' })
    }
  })

export type FollowupFormValues = z.infer<typeof followupFormSchema>
