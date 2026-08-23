import { Contact } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ContactBlock } from './ContactBlock'
import type { Member } from '@/types'

/** Reference Contact is the closest concept this schema has to "family" —
 * its relationship field (e.g. "Brother", "Father") is the actual family
 * signal, split out of ContactSection into its own Member 360 section. */
export function FamilyInformationCard({
  member,
  hideFollowupWhatsApp = false,
}: {
  member: Member
  /** True when FollowupWhatsAppActions' "WhatsApp Reference" button is
   * already visible elsewhere on screen (Member 360's Manager bottom
   * action bar) — see ContactSection.tsx's identical prop for the full
   * reasoning. */
  hideFollowupWhatsApp?: boolean
}) {
  const hasReference = member.reference_contact_name || member.reference_contact_phone

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
            showWhatsApp={!hideFollowupWhatsApp}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No family/reference contact on file.</p>
        )}
      </CardContent>
    </Card>
  )
}
