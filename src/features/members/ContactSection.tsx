import { UserRound, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ContactBlock } from './ContactBlock'
import { useProfile } from '@/contexts/ProfileContext'
import { buildDonationReminderMessage } from '@/features/followups/donationReminderMessage'
import { formatMobileNumber } from '@/lib/format'
import type { Member } from '@/types'

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value || '—'}</p>
    </div>
  )
}

/** Reference Contact deliberately lives in FamilyInformationCard, not here —
 * its relationship field is the closest thing this schema has to "family"
 * data, so it's split out into its own Member 360 section. */
export function ContactSection({
  member,
  hideMemberWhatsApp = false,
}: {
  member: Member
  /** True when a dedicated WhatsAppReminderButton for this same member is
   * already visible elsewhere on screen (Member 360's Manager bottom
   * action bar, which stays visible across every tab including this one)
   * — showing both would be a redundant second icon for the identical
   * action. Admin's Member 360 has no such bar, so this stays false
   * (visible) there. */
  hideMemberWhatsApp?: boolean
}) {
  const hasAddedBy = member.added_by_name || member.added_by_phone
  const { profile } = useProfile()
  // Same donation-reminder text as the dedicated Follow-up section WhatsApp
  // action (WhatsAppReminderButton) — this is the same action, just also
  // reachable from the member's own contact block.
  const memberWhatsappMessage = profile ? buildDonationReminderMessage(member.member_name, profile.full_name) : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mobile" value={formatMobileNumber(member.mobile_number)} />
          <Field label="Address" value={member.address} />
        </div>
        <div className="divide-y border-t pt-3">
          <ContactBlock
            label="Member"
            name={member.member_name}
            phone={member.mobile_number}
            icon={UserRound}
            tone="primary"
            whatsappMessage={memberWhatsappMessage}
            showWhatsApp={!hideMemberWhatsApp}
          />
          {hasAddedBy && (
            <ContactBlock
              label="Added By"
              name={member.added_by_name}
              phone={member.added_by_phone}
              icon={UserPlus}
              tone="gold"
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
