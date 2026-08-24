import { z } from 'zod'
import { optionalCountryIso2Schema, optionalLocalNumberSchema } from './common.schema'
import { todayISO } from '@/lib/format'

export const FOLLOW_UP_STATUSES = ['STARTED', 'IN_PROGRESS', 'COMPLETED', 'NOT_INTERESTED', 'CALLBACK_REQUIRED'] as const
export const FOLLOW_UP_METHODS = ['PHONE', 'WHATSAPP', 'IN_PERSON', 'OTHER'] as const
export const CONTACTED_PERSON_TYPES = ['MEMBER', 'ADDED_BY', 'REFERENCE_CONTACT', 'OTHER'] as const

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
    contacted_person_phone: optionalLocalNumberSchema,
    contacted_person_country: optionalCountryIso2Schema,
    contacted_person_relationship: z.string().trim().optional().or(z.literal('')),
    remarks: z.string().trim().optional().or(z.literal('')),
    next_follow_up_date: z.string().trim().optional().or(z.literal('')),
    // Not a visible form field — set only when resubmitting after the
    // user confirmed a possible-duplicate warning (see
    // useDuplicateConfirmation), so the server skips its soft check.
    confirmDuplicate: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.contacted_person_type === 'OTHER' && !data.contacted_person_name) {
      ctx.addIssue({ code: 'custom', path: ['contacted_person_name'], message: 'Enter the contact’s name.' })
    }
    // Only when the phone was actually typed through CountryPhoneField
    // (contacted_person_type = 'OTHER') — MEMBER/ADDED_BY/REFERENCE_CONTACT
    // auto-fill from that contact's own record, which may be a legacy one
    // with a phone but no stored country. That's a data-quality gap on the
    // member's record, not something that should silently block logging a
    // follow-up — and the CountryPhoneField that would show this error
    // isn't even rendered for those auto-filled types.
    if (data.contacted_person_type === 'OTHER' && data.contacted_person_phone && !data.contacted_person_country) {
      ctx.addIssue({ code: 'custom', path: ['contacted_person_country'], message: 'Select the phone number’s country.' })
    }
  })

export type FollowupFormValues = z.infer<typeof followupFormSchema>
