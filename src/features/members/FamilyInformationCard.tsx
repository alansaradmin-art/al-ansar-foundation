import { Contact } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ContactBlock } from './ContactBlock'
import { useProfile } from '@/contexts/ProfileContext'
import { buildReferenceContactReminderMessage } from '@/features/followups/donationReminderMessage'
import type { Member } from '@/types'

/** Reference Contact is the closest concept this schema has to "family" —
 * its relationship field (e.g. "Brother", "Father") is the actual family
 * signal, split out of ContactSection into its own Member 360 section. */
export function FamilyInformationCard({ member }: { member: Member }) {
  const hasReference = member.reference_contact_name || member.reference_contact_phone
  const { profile } = useProfile()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Family Information</CardTitle>
      </CardHeader>
      <CardContent>
        {hasReference ? (
          <ContactBlock
            label="Reference Contact"
            name={member.reference_contact_name}
            phone={member.reference_contact_phone}
            relationship={member.reference_contact_relationship}
            icon={Contact}
            tone="info"
            whatsappMessage={
              profile
                ? buildReferenceContactReminderMessage(
                    member.member_name,
                    member.reference_contact_name?.trim() || '',
                    profile.full_name,
                  )
                : undefined
            }
          />
        ) : (
          <p className="text-sm text-muted-foreground">No family/reference contact on file.</p>
        )}
      </CardContent>
    </Card>
  )
}
