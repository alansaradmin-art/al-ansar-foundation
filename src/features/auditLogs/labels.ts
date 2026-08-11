import type { ContactedPersonType, FollowUpMethod, FollowUpStatus, PaymentMethod } from '@/types'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  ONLINE: 'Online',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
}

export const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  NOT_STARTED: 'Not Started',
  COMPLETED: 'Completed',
  NOT_INTERESTED: 'Not Interested',
  CALLBACK_REQUIRED: 'Callback Required',
  OTHER: 'Other',
}

export const FOLLOW_UP_METHOD_LABELS: Record<FollowUpMethod, string> = {
  PHONE: 'Phone',
  WHATSAPP: 'WhatsApp',
  IN_PERSON: 'In Person',
  OTHER: 'Other',
}

export const CONTACTED_PERSON_TYPE_LABELS: Record<ContactedPersonType, string> = {
  MEMBER: 'Member',
  ADDED_BY: 'Added By',
  REFERENCE_CONTACT: 'Reference Contact',
  OTHER: 'Other',
}

/** Raw DB column name -> human label, for the before/after diff view. Only
 * needs entries for columns that are actually interesting in a diff (see
 * DIFF_SKIP_FIELDS for what's deliberately excluded instead). */
export const FIELD_LABELS: Record<string, string> = {
  member_name: 'Member Name',
  father_name: "Father's Name",
  mobile_number: 'Mobile Number',
  address: 'Address',
  added_by_type: 'Added By (Type)',
  added_by_name: 'Added By (Name)',
  added_by_phone: 'Added By (Phone)',
  reference_contact_type: 'Reference Contact (Type)',
  reference_contact_name: 'Reference Contact (Name)',
  reference_contact_phone: 'Reference Contact (Phone)',
  reference_contact_relationship: 'Reference Contact (Relationship)',
  assigned_manager_id: 'Assigned Manager',
  status: 'Status',
  full_name: 'Name',
  phone: 'Phone',
  email: 'Email',
  amount_inr: 'Amount',
  payment_method: 'Payment Method',
  transaction_reference: 'Transaction Reference',
  donation_date: 'Donation Date',
  notes: 'Notes',
  is_deleted: 'Deleted',
  deletion_reason: 'Deletion Reason',
  deleted_at: 'Deleted At',
  follow_up_date: 'Follow-up Date',
  follow_up_status: 'Follow-up Status',
  follow_up_method: 'Follow-up Method',
  contacted_person_type: 'Contacted',
  contacted_person_name: 'Contact Name',
  contacted_person_phone: 'Contact Phone',
  contacted_person_relationship: 'Relationship',
  remarks: 'Remarks',
}

/** Skipped from the generic before/after diff — either pure noise
 * (timestamps, the row's own id) or already surfaced via the dedicated
 * resolved-name header line (member_id/manager_id show as "Member: Ahmed
 * Khan" up top, not as a raw uuid in the diff table), or always equal to
 * the actor already shown prominently (recorded_by/created_by/deleted_by
 * are always the caller's own profile id in every current mutation path). */
export const DIFF_SKIP_FIELDS = new Set([
  'id',
  'created_at',
  'updated_at',
  'member_id',
  'manager_id',
  'recorded_by',
  'created_by',
  'deleted_by',
  'actor_profile_id',
  'donation_id',
  'donation_month',
  'donation_year',
])
