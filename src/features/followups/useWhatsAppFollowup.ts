import { useProfile } from '@/contexts/ProfileContext'
import { useCreateFollowup } from '@/hooks/useFollowups'
import { todayISO } from '@/lib/format'
import type { Member, MonthlyFollowup, ContactedPersonType } from '@/types'
import type { FollowupFormValues } from '@/schemas/followup.schema'

// Mirrors the OPEN_STATUSES set already duplicated in
// FollowupHistoryList.tsx and admin/FollowupsPage.tsx — a follow-up in one
// of these statuses is still an open attempt, so a member with one already
// belongs to "this period's status" and should not get a second row logged
// underneath it.
const OPEN_STATUSES = new Set(['STARTED', 'IN_PROGRESS', 'CALLBACK_REQUIRED'])

function contactFor(member: Member, type: ContactedPersonType) {
  if (type === 'ADDED_BY') {
    return { name: member.added_by_name, phone: member.added_by_phone, country: member.added_by_country, relationship: undefined }
  }
  if (type === 'REFERENCE_CONTACT') {
    return {
      name: member.reference_contact_name,
      phone: member.reference_contact_phone,
      country: member.reference_contact_country,
      relationship: member.reference_contact_relationship,
    }
  }
  return { name: member.member_name, phone: member.mobile_number, country: member.mobile_country, relationship: undefined }
}

/** Wires the existing "Send WhatsApp Message" buttons (ContactActions) to
 * automatically log a follow-up attempt — reuses the exact same create path
 * AddFollowupDialog uses (useCreateFollowup -> POST /api/followups), so
 * nothing new is added to the schema, the API, or audit logging.
 *
 * Manager-only, matching this app's existing rule that follow-ups are
 * always owned by the manager who logged them (POST /api/followups is
 * sendForbiddenUnlessManager, with no admin path) — an Admin's WhatsApp
 * click never attempts this and the button behaves exactly as it always
 * has for them.
 *
 * `latestFollowup` should be the member's most recent follow-up row
 * (forMember's own sort already puts it first) if the caller has it handy
 * — pass undefined when the caller already knows there's no open attempt
 * this period by construction (e.g. PendingMemberCard, which by definition
 * only renders members list_pending_followups says have none). When the
 * latest attempt is still open (STARTED/IN_PROGRESS/CALLBACK_REQUIRED),
 * this is a deliberate no-op: that row already represents this period's
 * status, and creating another STARTED row under it would duplicate it
 * rather than continue it — the existing In Progress tab's own "Update
 * Follow-up" action is what continues an open attempt, and this feature
 * doesn't change that.
 *
 * Silent by design in both directions — never blocks or delays the
 * WhatsApp link itself (callers fire this from onClick without
 * preventDefault), and never surfaces a toast or the duplicate-confirmation
 * dialog on failure (including an actual 409, if one ever raced past the
 * open-attempt check above): this is a best-effort background log of an
 * action whose real outcome (whether the message was ever sent) the app
 * has no way to know either way, not a user-facing form submission. */
export function useWhatsAppFollowupTrigger(member: Member, latestFollowup: MonthlyFollowup | undefined) {
  const { profile } = useProfile()
  const { mutate } = useCreateFollowup(profile?.manager_id ?? '', profile?.id ?? '')

  const canLog = profile?.role === 'MANAGER' && !!profile.manager_id
  const alreadyOpen = !!latestFollowup && OPEN_STATUSES.has(latestFollowup.follow_up_status)

  return function logWhatsAppFollowup(type: ContactedPersonType) {
    if (!canLog || alreadyOpen) return

    const contact = contactFor(member, type)
    const values: FollowupFormValues = {
      member_id: member.id,
      follow_up_date: todayISO(),
      follow_up_status: 'STARTED',
      follow_up_method: 'WHATSAPP',
      contacted_person_type: type,
      contacted_person_name: contact.name || '',
      contacted_person_phone: contact.phone || '',
      contacted_person_country: contact.country || '',
      contacted_person_relationship: contact.relationship || '',
      remarks: 'WhatsApp message initiated.',
      next_follow_up_date: '',
    }
    mutate(values, { onError: () => {} })
  }
}
