import { useProfile } from '@/contexts/ProfileContext'
import { WhatsAppActionButton } from './WhatsAppActionButton'
import {
  buildDonationReminderMessage,
  buildAddedByReminderMessage,
  buildReferenceContactReminderMessage,
} from './donationReminderMessage'
import type { Member } from '@/types'

/** The full set of "message someone about this member's donation" WhatsApp
 * actions for the Follow-up section. Member is always shown; Added By and
 * Reference Contact only when that person is actually on file — the same
 * hasAddedBy/hasReference gate ContactSection/PendingMemberCard/
 * FamilyInformationCard already use for showing their contact blocks at
 * all, so a button never appears for a contact this member doesn't have. */
export function FollowupWhatsAppActions({
  member,
  size = 'lg',
  className = 'flex-1',
}: {
  member: Member
  size?: 'default' | 'sm' | 'lg'
  className?: string
}) {
  const { profile } = useProfile()
  if (!profile) return null

  const hasAddedBy = member.added_by_name || member.added_by_phone
  const hasReference = member.reference_contact_name || member.reference_contact_phone

  return (
    <>
      <WhatsAppActionButton
        label="WhatsApp Member"
        phone={member.mobile_number}
        message={buildDonationReminderMessage(member.member_name, profile.full_name)}
        size={size}
        className={className}
      />
      {hasAddedBy && (
        <WhatsAppActionButton
          label="WhatsApp Added By"
          phone={member.added_by_phone}
          message={buildAddedByReminderMessage(member.member_name, member.added_by_name?.trim() || '', profile.full_name)}
          size={size}
          className={className}
        />
      )}
      {hasReference && (
        <WhatsAppActionButton
          label="WhatsApp Reference"
          phone={member.reference_contact_phone}
          message={buildReferenceContactReminderMessage(
            member.member_name,
            member.reference_contact_name?.trim() || '',
            profile.full_name,
          )}
          size={size}
          className={className}
        />
      )}
    </>
  )
}
