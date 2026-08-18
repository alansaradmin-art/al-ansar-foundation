import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import type { Member } from '@/types'

export function AuditInformationCard({ member }: { member: Member }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Audit Information</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Member Since</p>
          <p className="text-sm">{formatDateTime(member.created_at)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last Updated</p>
          <p className="text-sm">{formatDateTime(member.updated_at)}</p>
        </div>
      </CardContent>
    </Card>
  )
}
