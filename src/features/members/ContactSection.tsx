import { UserRound, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ContactBlock } from './ContactBlock'
import { useProfile } from '@/contexts/ProfileContext'
import { buildDonationReminderMessage, buildAddedByReminderMessage } from '@/features/followups/donationReminderMessage'
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
export function ContactSection({ member }: { member: Member }) {
  const hasAddedBy = member.added_by_name || member.added_by_phone
  const { profile } = useProfile()

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
            whatsappMessage={profile ? buildDonationReminderMessage(member.member_name, profile.full_name) : undefined}
          />
          {hasAddedBy && (
            <ContactBlock
              label="Added By"
              name={member.added_by_name}
              phone={member.added_by_phone}
              icon={UserPlus}
              tone="gold"
              whatsappMessage={
                profile
                  ? buildAddedByReminderMessage(member.member_name, member.added_by_name?.trim() || '', profile.full_name)
                  : undefined
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
