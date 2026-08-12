import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MemberFormDialog } from './MemberFormDialog'
import { MemberStatusBadge } from '@/components/StatusBadge'
import { useSetMemberStatus } from '@/hooks/useMembers'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { Member, Manager } from '@/types'

function StatusButton({ member }: { member: Member }) {
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
      {member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
    </Button>
  )
}

export function AdminMemberCard({ member, managerName }: { member: Member; managerName?: string }) {
  const subline = [member.father_name, member.mobile_number].filter(Boolean).join(' · ')
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link to={`/admin/members/${member.id}`} className="font-medium hover:underline">
            {member.member_name}
          </Link>
          {subline && <p className="text-xs text-muted-foreground">{subline}</p>}
          {managerName && <p className="text-xs text-muted-foreground">Manager: {managerName}</p>}
        </div>
        <MemberStatusBadge status={member.status} />
      </div>
      <div className="flex gap-2">
        <MemberFormDialog member={member} />
        <StatusButton member={member} />
      </div>
    </div>
  )
}

export function AdminMemberTableRow({ member, managers }: { member: Member; managers: Manager[] }) {
  const managerName = managers.find((m) => m.id === member.assigned_manager_id)?.full_name
  return (
    <tr className="border-b last:border-0">
      <td className="p-3">
        <Link to={`/admin/members/${member.id}`} className="font-medium hover:underline">
          {member.member_name}
        </Link>
      </td>
      <td className="p-3 text-muted-foreground">{member.father_name || '—'}</td>
      <td className="p-3 text-muted-foreground">{member.mobile_number || '—'}</td>
      <td className="p-3 text-muted-foreground">{managerName || '—'}</td>
      <td className="p-3">
        <MemberStatusBadge status={member.status} />
      </td>
      <td className="p-3">
        <div className="flex gap-2">
          <MemberFormDialog member={member} />
          <StatusButton member={member} />
        </div>
      </td>
    </tr>
  )
}
