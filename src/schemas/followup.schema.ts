import { z } from 'zod'
import { optionalCountryIso2Schema } from './common.schema'
import { todayISO } from '@/lib/format'

const LOCAL_NUMBER_PATTERN = /^\d{4,14}$/

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
    // Not the strict digits-only localNumberSchema — MEMBER/ADDED_BY/
    // REFERENCE_CONTACT auto-fill this from that contact's own record
    // (added_by_phone/reference_contact_phone specifically predate this
    // app's phone normalization and may still hold a raw legacy value).
    // The strict format is only enforced below, and only for 'OTHER',
    // the one type that's actually typed by hand.
    contacted_person_phone: z.string().trim().optional().or(z.literal('')),
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
    // Both the strict digits-only format AND the country requirement are
    // only enforced when the phone was actually typed through
    // CountryPhoneField (contacted_person_type = 'OTHER') —
    // MEMBER/ADDED_BY/REFERENCE_CONTACT auto-fill from that contact's own
    // record, which may be a legacy unnormalized value and/or have no
    // stored country. That's a data-quality characteristic of that
    // member's record, not something that should silently block logging a
    // follow-up — and CountryPhoneField (and its error messages) isn't
    // even rendered for those auto-filled types, so either issue would
    // otherwise be completely invisible.
    if (data.contacted_person_type === 'OTHER' && data.contacted_person_phone) {
      if (!LOCAL_NUMBER_PATTERN.test(data.contacted_person_phone)) {
        ctx.addIssue({
          code: 'custom',
          path: ['contacted_person_phone'],
          message: 'Enter a valid local number (digits only, no country code).',
        })
      } else if (!data.contacted_person_country) {
        ctx.addIssue({ code: 'custom', path: ['contacted_person_country'], message: 'Select the phone number’s country.' })
      }
    }
  })

export type FollowupFormValues = z.infer<typeof followupFormSchema>
