import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { differenceInCalendarMonths } from 'date-fns'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MemberFormDialog } from './MemberFormDialog'
import { AssignManagerDialog } from './AssignManagerDialog'
import { MemberStatusBadge, UnassignedManagerBadge } from '@/components/StatusBadge'
import { useSetMemberStatus } from '@/hooks/useMembers'
import { getFriendlyErrorMessage } from '@/lib/errors'
import { formatDate, formatMobileNumber } from '@/lib/format'
import type { Member, Manager } from '@/types'

/** Mirrors api/members.ts's INCOMPLETE_MEMBER_OR field set exactly, so the
 * "why is this member incomplete" text always matches why it showed up in
 * the filtered list in the first place. */
function missingFields(member: Member): string[] {
  const missing: string[] = []
  if (!member.mobile_number?.trim()) missing.push('Mobile')
  if (!member.address?.trim()) missing.push('Address')
  if (!member.father_name?.trim()) missing.push("Father's Name")
  if (!member.added_by_name?.trim()) missing.push('Added By')
  if (!member.reference_contact_name?.trim()) missing.push('Reference Contact')
  return missing
}

function MissingFieldsNote({ member }: { member: Member }) {
  const missing = missingFields(member)
  if (missing.length === 0) return null
  return <p className="mt-0.5 text-xs font-medium text-gold-foreground">Missing: {missing.join(', ')}</p>
}

/** Months since the reference point used by stale_active_member_ids()
 * (supabase/migrations/0023_member_inactivity.sql) — the member's latest
 * non-deleted donation, or, if they've never donated, their join date.
 * Mirrored client-side purely for display; the actual INACTIVE flag is
 * always set by the scheduled job, never derived here. */
function InactivityNote({ member, lastDonationDate }: { member: Member; lastDonationDate: string | null | undefined }) {
  if (lastDonationDate === undefined) return null
  const referenceDate = lastDonationDate ? new Date(lastDonationDate) : new Date(member.created_at)
  const months = differenceInCalendarMonths(new Date(), referenceDate)
  const monthsLabel = `${months} month${months === 1 ? '' : 's'} inactive`
  return (
    <p className="mt-0.5 text-xs text-muted-foreground">
      {lastDonationDate ? `Last donation: ${formatDate(lastDonationDate)}` : 'Never donated'} · {monthsLabel}
    </p>
  )
}

export function StatusButton({ member }: { member: Member }) {
  const { mutate, isPending } = useSetMemberStatus()
  const nextStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        mutate(
          { id: member.id, status: nextStatus },
          {
            onSuccess: () => toast.success(`Member ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`),
            onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to update member status.')),
          },
        )
      }
    >
      {isPending
        ? member.status === 'ACTIVE'
          ? 'Deactivating…'
          : 'Activating…'
        : member.status === 'ACTIVE'
          ? 'Deactivate'
          : 'Activate'}
    </Button>
  )
}

export function AdminMemberCard({
  member,
  managerName,
  showMissingFields,
  lastDonationDates,
}: {
  member: Member
  managerName?: string
  showMissingFields?: boolean
  lastDonationDates?: Record<string, string | null>
}) {
  const subline = [member.father_name, formatMobileNumber(member.mobile_number)].filter(Boolean).join(' · ')
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link to={`/admin/members/${member.id}`} className="font-medium hover:underline">
            {member.member_name}
          </Link>
          {subline && <p className="text-xs text-muted-foreground">{subline}</p>}
          {member.address && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{member.address}</span>
            </p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {managerName ? `Manager: ${managerName}` : <UnassignedManagerBadge />}
          </p>
          {showMissingFields && <MissingFieldsNote member={member} />}
          {lastDonationDates && member.status === 'INACTIVE' && (
            <InactivityNote member={member} lastDonationDate={lastDonationDates[member.id]} />
          )}
        </div>
        <MemberStatusBadge status={member.status} />
      </div>
      <div className="flex flex-wrap gap-2">
        <MemberFormDialog member={member} />
        {!member.assigned_manager_id && <AssignManagerDialog member={member} />}
        <StatusButton member={member} />
      </div>
    </div>
  )
}

export function AdminMemberTableRow({
  member,
  managers,
  showMissingFields,
  lastDonationDates,
}: {
  member: Member
  managers: Manager[]
  showMissingFields?: boolean
  lastDonationDates?: Record<string, string | null>
}) {
  const managerName = managers.find((m) => m.id === member.assigned_manager_id)?.full_name
  return (
    <tr className="border-b last:border-0">
      <td className="p-3">
        <Link to={`/admin/members/${member.id}`} className="font-medium hover:underline">
          {member.member_name}
        </Link>
        {showMissingFields && <MissingFieldsNote member={member} />}
        {lastDonationDates && member.status === 'INACTIVE' && (
          <InactivityNote member={member} lastDonationDate={lastDonationDates[member.id]} />
        )}
      </td>
      <td className="p-3 text-muted-foreground">{member.father_name || '—'}</td>
      <td className="p-3 text-muted-foreground">{formatMobileNumber(member.mobile_number) || '—'}</td>
      <td className="max-w-48 truncate p-3 text-muted-foreground">{member.address || '—'}</td>
      <td className="p-3 text-muted-foreground">{managerName || <UnassignedManagerBadge />}</td>
      <td className="p-3">
        <MemberStatusBadge status={member.status} />
      </td>
      <td className="p-3">
        <div className="flex flex-wrap gap-2">
          <MemberFormDialog member={member} />
          {!member.assigned_manager_id && <AssignManagerDialog member={member} />}
          <StatusButton member={member} />
        </div>
      </td>
    </tr>
  )
}
