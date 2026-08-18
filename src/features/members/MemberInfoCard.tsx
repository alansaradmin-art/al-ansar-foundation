import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MemberStatusBadge } from '@/components/StatusBadge'
import type { Member } from '@/types'

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value || '—'}</p>
    </div>
  )
}

export function MemberInfoCard({ member }: { member: Member }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <Field label="Member Name" value={member.member_name} />
        <Field label="Father Name" value={member.father_name} />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
          <MemberStatusBadge status={member.status} />
        </div>
      </CardContent>
    </Card>
  )
}
