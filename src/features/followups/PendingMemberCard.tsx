import { Link } from 'react-router-dom'
import { UserRound, UserPlus, Contact, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ContactBlock } from '@/features/members/ContactBlock'
import { DonationStatusBadge, PendingFollowupBadge } from '@/components/StatusBadge'
import { AddDonationDialog } from '@/features/donations/AddDonationDialog'
import { AddFollowupDialog } from '@/features/followups/AddFollowupDialog'
import {
  buildDonationReminderMessage,
  buildAddedByReminderMessage,
  buildReferenceContactReminderMessage,
} from '@/features/followups/donationReminderMessage'
import { useProfile } from '@/contexts/ProfileContext'
import type { Member } from '@/types'

export function PendingMemberCard({ member, memberHref }: { member: Member; memberHref: string }) {
  const hasAddedBy = member.added_by_name || member.added_by_phone
  const hasReference = member.reference_contact_name || member.reference_contact_phone
  const { profile } = useProfile()

  return (
    <Card className="overflow-hidden border-l-4 border-l-warning py-0">
      <div className="space-y-2 border-b bg-warning/10 px-6 py-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-medium">
            <Link to={memberHref} className="hover:underline">
              {member.member_name}
            </Link>
            {member.father_name && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">{member.father_name}</span>
            )}
          </p>
          <PendingFollowupBadge />
        </div>
        <DonationStatusBadge received={false} />
      </div>
      <CardContent className="divide-y py-2">
        <ContactBlock
          label="Member"
          name={member.member_name}
          phone={member.mobile_number}
          country={member.mobile_country}
          icon={UserRound}
          tone="primary"
          whatsappMessage={profile ? buildDonationReminderMessage(member.member_name, profile.full_name) : undefined}
        />
        {hasAddedBy && (
          <ContactBlock
            label="Added By"
            name={member.added_by_name}
            phone={member.added_by_phone}
            country={member.added_by_country}
            icon={UserPlus}
            tone="gold"
            whatsappMessage={
              profile
                ? buildAddedByReminderMessage(member.member_name, member.added_by_name?.trim() || '', profile.full_name)
                : undefined
            }
          />
        )}
        {hasReference && (
          <ContactBlock
            label="Reference Contact"
            name={member.reference_contact_name}
            phone={member.reference_contact_phone}
            country={member.reference_contact_country}
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
        )}
      </CardContent>
      <div className="flex flex-wrap gap-2 border-t bg-muted/30 p-3">
        <AddDonationDialog memberId={member.id} variant="outline" size="default" className="flex-1" />
        <AddFollowupDialog
          member={member}
          label="Complete Follow-up"
          icon={CheckCircle2}
          variant="default"
          size="default"
          className="flex-1"
        />
      </div>
    </Card>
  )
}
