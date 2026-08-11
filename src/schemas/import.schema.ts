import { z } from 'zod'

/**
 * Shape of one row after the raw spreadsheet has been mapped to our column
 * names. Deliberately lenient (mostly-optional strings) — validation errors
 * are collected per row and shown in the preview rather than thrown, so one
 * bad row doesn't block reviewing the rest of the file.
 */
export const importRowSchema = z.object({
  member_id: z.string().trim().min(1, 'Member ID is required.'),
  member_name: z.string().trim().min(1, 'Member name is required.'),
  father_name: z.string().trim().optional().or(z.literal('')),
  mobile_number: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  added_by_name: z.string().trim().optional().or(z.literal('')),
  added_by_phone: z.string().trim().optional().or(z.literal('')),
  reference_contact_name: z.string().trim().optional().or(z.literal('')),
  reference_contact_phone: z.string().trim().optional().or(z.literal('')),
  reference_contact_relationship: z.string().trim().optional().or(z.literal('')),
  assigned_manager: z.string().trim().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

export type ImportRow = z.infer<typeof importRowSchema>

export const IMPORT_COLUMNS: { key: keyof ImportRow; label: string; required: boolean }[] = [
  { key: 'member_id', label: 'Member ID', required: true },
  { key: 'member_name', label: 'Member Name', required: true },
  { key: 'father_name', label: 'Father Name', required: false },
  { key: 'mobile_number', label: 'Mobile Number', required: false },
  { key: 'address', label: 'Address', required: false },
  { key: 'added_by_name', label: 'Added By', required: false },
  { key: 'added_by_phone', label: 'Added By Phone', required: false },
  { key: 'reference_contact_name', label: 'Reference Contact Name', required: false },
  { key: 'reference_contact_phone', label: 'Reference Contact Phone', required: false },
  { key: 'reference_contact_relationship', label: 'Reference Contact Relationship', required: false },
  { key: 'assigned_manager', label: 'Assigned Manager', required: false },
  { key: 'status', label: 'Status', required: false },
]
