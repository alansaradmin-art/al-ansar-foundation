import { UserRound, UserPlus, Contact } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ContactBlock } from './ContactBlock'
import type { Member } from '@/types'

export function ContactSection({ member }: { member: Member }) {
  const hasAddedBy = member.added_by_name || member.added_by_phone
  const hasReference = member.reference_contact_name || member.reference_contact_phone

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Who should I contact?</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        <ContactBlock label="Member" name={member.member_name} phone={member.mobile_number} icon={UserRound} tone="primary" />
        {hasAddedBy && (
          <ContactBlock
            label="Added By"
            name={member.added_by_name}
            phone={member.added_by_phone}
            icon={UserPlus}
            tone="gold"
          />
        )}
        {hasReference && (
          <ContactBlock
            label="Reference Contact"
            name={member.reference_contact_name}
            phone={member.reference_contact_phone}
            relationship={member.reference_contact_relationship}
            icon={Contact}
            tone="info"
          />
        )}
      </CardContent>
    </Card>
  )
}
