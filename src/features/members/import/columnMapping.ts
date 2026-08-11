import type { ImportRow } from '@/schemas/import.schema'

const ALIASES: Record<keyof ImportRow, string[]> = {
  member_id: ['member id', 'memberid', 'id'],
  member_name: ['member name', 'name', 'membername'],
  father_name: ['father name', 'fathername', "father's name"],
  mobile_number: ['mobile number', 'mobile', 'phone', 'phone number'],
  address: ['address'],
  added_by_name: ['added by', 'addedby', 'added by name'],
  added_by_phone: ['added by phone', 'addedbyphone'],
  reference_contact_name: ['reference contact name', 'reference name', 'reference contact'],
  reference_contact_phone: ['reference contact phone', 'reference phone'],
  reference_contact_relationship: ['reference contact relationship', 'relationship'],
  assigned_manager: ['assigned manager', 'manager'],
  status: ['status'],
}

function normalize(header: string): string {
  return header.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

/** Best-effort header -> field guess. Admin can still override in the UI. */
export function guessColumnMapping(headers: string[]): Record<number, keyof ImportRow | null> {
  const mapping: Record<number, keyof ImportRow | null> = {}
  headers.forEach((header, index) => {
    const normalized = normalize(header)
    const match = (Object.keys(ALIASES) as (keyof ImportRow)[]).find((field) =>
      ALIASES[field].includes(normalized),
    )
    mapping[index] = match ?? null
  })
  return mapping
}

export const IMPORT_FIELD_LABELS: Record<keyof ImportRow, string> = {
  member_id: 'Member ID',
  member_name: 'Member Name',
  father_name: 'Father Name',
  mobile_number: 'Mobile Number',
  address: 'Address',
  added_by_name: 'Added By',
  added_by_phone: 'Added By Phone',
  reference_contact_name: 'Reference Contact Name',
  reference_contact_phone: 'Reference Contact Phone',
  reference_contact_relationship: 'Reference Contact Relationship',
  assigned_manager: 'Assigned Manager',
  status: 'Status',
}
