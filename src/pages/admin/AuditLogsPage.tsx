import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import { PageHeader } from '@/components/PageHeader'
import { TableSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ENTITY_TYPES = ['members', 'donations', 'monthly_followups', 'managers']

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
}

export default function AuditLogsPage() {
  const [entityType, setEntityType] = useState('ALL')
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useAuditLogs({
    entityType: entityType === 'ALL' ? undefined : entityType,
    page,
    pageSize: 30,
  })

  return (
    <div className="space-y-4">
      <PageHeader title="Audit Logs" description="Every change made to members, donations, follow-ups, and managers" />

      <Select value={entityType} onValueChange={setEntityType}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="All record types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All record types</SelectItem>
          {ENTITY_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading && <TableSkeleton cols={3} />}
      {isError && <ErrorState message="Unable to load audit logs. Please try again." onRetry={refetch} />}
      {data && data.rows.length === 0 && (
        <EmptyState icon={<ShieldCheck className="size-8" />} title="No audit activity recorded yet." />
      )}

      {data && data.rows.length > 0 && (
        <div className="space-y-2">
          {data.rows.map((log) => (
            <div key={log.id} className="rounded-xl border bg-card shadow-sm p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{log.action}</Badge>
                <span className="text-muted-foreground">{log.actor?.full_name ?? 'System'}</span>
                <span className="ml-auto text-xs text-muted-foreground">{formatTimestamp(log.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.count > 30 && (
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(data.count / 30)}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(data.count / 30)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
