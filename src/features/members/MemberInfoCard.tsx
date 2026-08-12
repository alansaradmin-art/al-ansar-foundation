import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export function MemberInfoCard({ member }: { member: Member }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Member Information</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <Field label="Father Name" value={member.father_name} />
        <Field label="Mobile" value={formatMobileNumber(member.mobile_number)} />
        <Field label="Address" value={member.address} />
      </CardContent>
    </Card>
  )
}
