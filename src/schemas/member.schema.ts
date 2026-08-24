import { z } from 'zod'
import { CONTACT_TYPES, optionalCountryIso2Schema, optionalLocalNumberSchema, phoneSchema } from './common.schema'

const LOCAL_NUMBER_PATTERN = /^\d{4,14}$/

export const memberFormSchema = z
  .object({
    // member_id is system-generated (see migration 0009_auto_member_id.sql)
    // — Admin never enters or edits it.
    member_name: z.string().trim().min(1, 'Member name is required.'),
    father_name: z.string().trim().optional().or(z.literal('')),
    mobile_number: optionalLocalNumberSchema,
    mobile_country: optionalCountryIso2Schema,
    address: z.string().trim().optional().or(z.literal('')),

    added_by_type: z.enum(CONTACT_TYPES).optional(),
    added_by_id: z.string().uuid().optional(),
    added_by_name: z.string().trim().optional().or(z.literal('')),
    // Not the strict digits-only localNumberSchema — Registered Member
    // mode copies this from the linked member's own record, which (for
    // added_by_phone/reference_contact_phone specifically) predates this
    // app's phone normalization and may still hold a raw legacy value
    // ("+91 98765 43210", spaces, etc.) that was never re-saved through
    // CountryPhoneField. The strict format is only enforced below, and
    // only when the value was actually typed by hand.
    added_by_phone: z.string().trim().optional().or(z.literal('')),
    added_by_country: optionalCountryIso2Schema,

    reference_contact_type: z.enum(CONTACT_TYPES).optional(),
    reference_contact_id: z.string().uuid().optional(),
    reference_contact_name: z.string().trim().optional().or(z.literal('')),
    reference_contact_phone: z.string().trim().optional().or(z.literal('')),
    reference_contact_country: optionalCountryIso2Schema,
    reference_contact_relationship: z.string().trim().optional().or(z.literal('')),

    assigned_manager_id: z.string().uuid('Assign a manager.').optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .superRefine((data, ctx) => {
    if (data.added_by_type === 'REGISTERED_MEMBER' && !data.added_by_id) {
      ctx.addIssue({ code: 'custom', path: ['added_by_id'], message: 'Select the member who added this member.' })
    }
    if (data.added_by_type === 'EXTERNAL_CONTACT' && !data.added_by_name) {
      ctx.addIssue({ code: 'custom', path: ['added_by_name'], message: 'Enter the name of the person who added this member.' })
    }
    if (data.reference_contact_type === 'REGISTERED_MEMBER' && !data.reference_contact_id) {
      ctx.addIssue({ code: 'custom', path: ['reference_contact_id'], message: 'Select the reference contact.' })
    }
    if (data.reference_contact_type === 'EXTERNAL_CONTACT' && !data.reference_contact_name) {
      ctx.addIssue({ code: 'custom', path: ['reference_contact_name'], message: 'Enter the reference contact’s name.' })
    }
    if (data.mobile_number && !data.mobile_country) {
      ctx.addIssue({ code: 'custom', path: ['mobile_country'], message: 'Select the mobile number’s country.' })
    }
    // Both the strict digits-only format AND the country requirement are
    // only enforced when the phone was actually typed through
    // CountryPhoneField (Manager/External Contact) — Registered Member
    // copies whatever the linked member has on file as-is, which may be a
    // legacy unnormalized value and/or have no stored country. That's a
    // data-quality characteristic of THAT member's record, not something
    // that should silently block saving THIS one — and CountryPhoneField
    // (and its error messages) isn't even rendered in Registered Member
    // mode, so either issue would otherwise be completely invisible.
    if (data.added_by_type !== 'REGISTERED_MEMBER' && data.added_by_phone) {
      if (!LOCAL_NUMBER_PATTERN.test(data.added_by_phone)) {
        ctx.addIssue({ code: 'custom', path: ['added_by_phone'], message: 'Enter a valid local number (digits only, no country code).' })
      } else if (!data.added_by_country) {
        ctx.addIssue({ code: 'custom', path: ['added_by_country'], message: 'Select the phone number’s country.' })
      }
    }
    if (data.reference_contact_type !== 'REGISTERED_MEMBER' && data.reference_contact_phone) {
      if (!LOCAL_NUMBER_PATTERN.test(data.reference_contact_phone)) {
        ctx.addIssue({
          code: 'custom',
          path: ['reference_contact_phone'],
          message: 'Enter a valid local number (digits only, no country code).',
        })
      } else if (!data.reference_contact_country) {
        ctx.addIssue({ code: 'custom', path: ['reference_contact_country'], message: 'Select the phone number’s country.' })
      }
    }
  })

export type MemberFormValues = z.infer<typeof memberFormSchema>

export { phoneSchema }
