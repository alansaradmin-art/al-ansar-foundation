import { UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ContactBlock } from './ContactBlock'
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
 * data, so it's split out into its own Member 360 section.
 *
 * The member's own mobile number is only ever shown once, in the Mobile
 * field above — there's no separate "Member" ContactBlock repeating it,
 * since that duplicated the exact same number/name already on screen.
 * Added By is a different person, so it isn't duplicate information and
 * keeps its own block (reference-only, no Call/WhatsApp — see
 * ContactBlock's hideActions; those stay in the Follow-ups section, where
 * contacting someone is actually part of the workflow). */
export function ContactSection({ member }: { member: Member }) {
  const hasAddedBy = member.added_by_name || member.added_by_phone

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mobile" value={formatMobileNumber(member.mobile_number, member.mobile_country)} />
          <Field label="Address" value={member.address} />
        </div>
        {hasAddedBy && (
          <div className="border-t pt-3">
            <ContactBlock
              label="Added By"
              name={member.added_by_name}
              phone={member.added_by_phone}
              country={member.added_by_country}
              icon={UserPlus}
              tone="gold"
              hideActions
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
