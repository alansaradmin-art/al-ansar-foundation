import { Link } from 'react-router-dom'
import { UserRound, UserPlus, Contact, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ContactBlock } from '@/features/members/ContactBlock'
import { FollowupStatusBadge } from '@/components/StatusBadge'
import { AddDonationDialog } from '@/features/donations/AddDonationDialog'
import { EditFollowupDialog } from '@/features/followups/EditFollowupDialog'
import {
  buildDonationReminderMessage,
  buildAddedByReminderMessage,
  buildReferenceContactReminderMessage,
} from '@/features/followups/donationReminderMessage'
import { useProfile } from '@/contexts/ProfileContext'
import { useMemberFollowups } from '@/hooks/useFollowups'
import { formatDate } from '@/lib/format'
import type { Member } from '@/types'

/** The In Progress tab's counterpart to PendingMemberCard — same contact
 * blocks/WhatsApp/Add Donation action, but the top status area and the
 * primary action reflect the member's open follow-up attempt (fetched here
 * via useMemberFollowups rather than returned by list_open_followups
 * itself, so the RPC stays a plain "setof members" like list_pending_followups
 * instead of a bespoke composite shape). */
export function InProgressMemberCard({ member, memberHref }: { member: Member; memberHref: string }) {
  const hasAddedBy = member.added_by_name || member.added_by_phone
  const hasReference = member.reference_contact_name || member.reference_contact_phone
  const { profile } = useProfile()
  const { data: followups } = useMemberFollowups(member.id)
  // list_open_followups() only returns a member whose latest row this
  // period is already open, so once loaded there is always at least one —
  // rows[0] here agrees with that RPC's own tiebreak (see
  // api/followups.ts's ?action=forMember comment).
  const latest = followups?.[0]

  return (
    <Card className="overflow-hidden border-l-4 border-l-teal py-0">
      <div className="space-y-2 border-b bg-teal/10 px-6 py-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-medium">
            <Link to={memberHref} className="hover:underline">
              {member.member_name}
            </Link>
            {member.father_name && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">{member.father_name}</span>
            )}
          </p>
          {latest && <FollowupStatusBadge status={latest.follow_up_status} />}
        </div>
        {latest && (
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <p>Last attempt: {formatDate(latest.follow_up_date)}</p>
            {latest.remarks && <p className="line-clamp-2">{latest.remarks}</p>}
          </div>
        )}
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
        <AddDonationDialog memberId={member.id} member={member} variant="outline" size="default" className="flex-1" />
        {latest && (
          <EditFollowupDialog
            followup={latest}
            member={member}
            label="Update Follow-up"
            icon={RefreshCw}
            variant="default"
            size="default"
            className="flex-1"
          />
        )}
      </div>
    </Card>
  )
}
