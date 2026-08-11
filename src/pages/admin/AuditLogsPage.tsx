import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAuditLogs, useAuditLogActors } from '@/hooks/useAuditLogs'
import { PageHeader } from '@/components/PageHeader'
import { TableSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState, ErrorState } from '@/components/StateViews'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker, type DateRangeValue } from '@/components/DateRangePicker'
import { MemberPicker } from '@/features/members/MemberPicker'
import { AuditLogEntry } from '@/features/auditLogs/AuditLogEntry'
import { ACTION_TYPE_OPTIONS, findActionTypeOption } from '@/features/auditLogs/ActionTypeOptions'
import { FOLLOW_UP_METHOD_LABELS, FOLLOW_UP_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/features/auditLogs/labels'
import type { FollowUpMethod, FollowUpStatus, Member, PaymentMethod } from '@/types'

const PAGE_SIZE = 20

export default function AuditLogsPage() {
  const [actionType, setActionType] = useState('ALL')
  const [dateRange, setDateRange] = useState<DateRangeValue | undefined>(undefined)
  const [actorProfileId, setActorProfileId] = useState('ALL')
  const [member, setMember] = useState<Pick<Member, 'id' | 'member_name' | 'member_id'> | null>(null)
  const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatus | 'ALL'>('ALL')
  const [followUpMethod, setFollowUpMethod] = useState<FollowUpMethod | 'ALL'>('ALL')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'ALL'>('ALL')
  const [page, setPage] = useState(1)

  const selectedAction = findActionTypeOption(actionType)
  const isFollowupAction = selectedAction?.entityType === 'monthly_followups'
  const isDonationAction = selectedAction?.entityType === 'donations'

  const { data: actors = [] } = useAuditLogActors()
  const { data, isLoading, isError, refetch } = useAuditLogs({
    entityType: selectedAction?.entityType,
    action: selectedAction?.action,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    actorProfileId: actorProfileId === 'ALL' ? undefined : actorProfileId,
    memberId: member?.id,
    followUpStatus: isFollowupAction && followUpStatus !== 'ALL' ? followUpStatus : undefined,
    followUpMethod: isFollowupAction && followUpMethod !== 'ALL' ? followUpMethod : undefined,
    paymentMethod: isDonationAction && paymentMethod !== 'ALL' ? paymentMethod : undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  function handleActionTypeChange(value: string) {
    setActionType(value)
    setPage(1)
    const option = findActionTypeOption(value)
    if (option?.entityType !== 'monthly_followups') {
      setFollowUpStatus('ALL')
      setFollowUpMethod('ALL')
    }
    if (option?.entityType !== 'donations') {
      setPaymentMethod('ALL')
    }
  }

  function handleDateRangeChange(value: DateRangeValue | undefined) {
    setDateRange(value)
    setPage(1)
  }

  function handleActorChange(value: string) {
    setActorProfileId(value)
    setPage(1)
  }

  function handleMemberChange(m: Pick<Member, 'id' | 'member_name' | 'member_id' | 'mobile_number'>) {
    setMember(m)
    setPage(1)
  }

  function handleMemberClear() {
    setMember(null)
    setPage(1)
  }

  function handleFollowUpStatusChange(value: string) {
    setFollowUpStatus(value as FollowUpStatus | 'ALL')
    setPage(1)
  }

  function handleFollowUpMethodChange(value: string) {
    setFollowUpMethod(value as FollowUpMethod | 'ALL')
    setPage(1)
  }

  function handlePaymentMethodChange(value: string) {
    setPaymentMethod(value as PaymentMethod | 'ALL')
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Audit Logs" description="Every change made to members, donations, follow-ups, and managers" />

      <div className="flex flex-wrap gap-2">
        <Select value={actionType} onValueChange={handleActionTypeChange}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All actions</SelectItem>
            {ACTION_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />

        <Select value={actorProfileId} onValueChange={handleActorChange}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="All managers/users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All managers/users</SelectItem>
            {actors.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.full_name} ({a.role === 'ADMIN' ? 'Admin' : 'Manager'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-full sm:w-64">
          <MemberPicker value={member} onChange={handleMemberChange} onClear={handleMemberClear} />
        </div>

        <Select value={followUpStatus} onValueChange={handleFollowUpStatusChange} disabled={!isFollowupAction}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Any follow-up status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any follow-up status</SelectItem>
            {Object.entries(FOLLOW_UP_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={followUpMethod} onValueChange={handleFollowUpMethodChange} disabled={!isFollowupAction}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Any follow-up method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any follow-up method</SelectItem>
            {Object.entries(FOLLOW_UP_METHOD_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={paymentMethod} onValueChange={handlePaymentMethodChange} disabled={!isDonationAction}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Any payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any payment method</SelectItem>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <TableSkeleton cols={3} />}
      {isError && <ErrorState message="Unable to load audit logs. Please try again." onRetry={refetch} />}
      {data && data.rows.length === 0 && (
        <EmptyState icon={<ShieldCheck className="size-8" />} title="No audit activity found for these filters." />
      )}

      {data && data.rows.length > 0 && (
        <div className="space-y-2">
          {data.rows.map((log) => (
            <AuditLogEntry key={log.id} log={log} />
          ))}
        </div>
      )}

      {data && data.count > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(data.count / PAGE_SIZE)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(data.count / PAGE_SIZE)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
