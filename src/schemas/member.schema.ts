import { z } from 'zod'
import { CONTACT_TYPES, optionalCountryIso2Schema, optionalLocalNumberSchema, phoneSchema } from './common.schema'

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
    added_by_phone: optionalLocalNumberSchema,
    added_by_country: optionalCountryIso2Schema,

    reference_contact_type: z.enum(CONTACT_TYPES).optional(),
    reference_contact_id: z.string().uuid().optional(),
    reference_contact_name: z.string().trim().optional().or(z.literal('')),
    reference_contact_phone: optionalLocalNumberSchema,
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
    if (data.added_by_phone && !data.added_by_country) {
      ctx.addIssue({ code: 'custom', path: ['added_by_country'], message: 'Select the phone number’s country.' })
    }
    if (data.reference_contact_phone && !data.reference_contact_country) {
      ctx.addIssue({ code: 'custom', path: ['reference_contact_country'], message: 'Select the phone number’s country.' })
    }
  })

export type MemberFormValues = z.infer<typeof memberFormSchema>

export { phoneSchema }
