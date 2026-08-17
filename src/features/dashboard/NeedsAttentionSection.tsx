import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { UserX, ClipboardX, IndianRupee, Users, FileWarning, ChevronRight, PartyPopper } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useUnassignedMembersCount, useIncompleteMembersCount } from '@/hooks/useMembers'
import { useOverdueFollowups } from '@/hooks/useFollowups'
import { useDonationEngagementReport } from '@/hooks/useDashboard'
import { getNonDonorThreshold } from '@/services/settings'
import { queryKeys } from '@/lib/queryKeys'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/StateViews'
import type { Period } from '@/types'

type Tone = 'destructive' | 'warning' | 'gold'

const TONE_CHIP: Record<Tone, string> = {
  destructive: 'bg-destructive/10 text-destructive',
  warning: 'bg-warning/20 text-warning-foreground',
  gold: 'bg-gold/25 text-gold-foreground',
}

function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function AttentionRow({
  to,
  tone,
  icon: Icon,
  count,
  label,
  description,
}: {
  to: string
  tone: Tone
  icon: LucideIcon
  count: number
  label: string
  description: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:bg-accent/40"
    >
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', TONE_CHIP[tone])}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold">
          <span className="tabular-nums">{count}</span> {label}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

export function NeedsAttentionSection({ period }: { period: Period | null }) {
  const { getToken } = useAuth()

  const { data: unassignedCount = 0 } = useUnassignedMembersCount()

  const { data: overdueRows } = useOverdueFollowups(undefined, period?.month, period?.year)
  const overdueCount = overdueRows?.length ?? 0

  // Donation Engagement data doubles as the source for both "haven't
  // donated recently" and the per-manager non-donor grouping below — one
  // fetch, two derived views, scoped to the same period the rest of the
  // Dashboard already uses (no separate "recent period" concept invented).
  const engagementParams = useMemo(() => {
    if (!period) return undefined
    const anchor = new Date(period.year, period.month - 1, 1)
    return { dateFrom: toISO(startOfMonth(anchor)), dateTo: toISO(endOfMonth(anchor)) }
  }, [period])
  const { data: engagementRows } = useDonationEngagementReport(engagementParams)
  const notDonatedCount = engagementRows?.filter((r) => !r.donated).length ?? 0

  const { data: incompleteCount = 0 } = useIncompleteMembersCount()

  const { data: threshold = 50 } = useQuery({
    queryKey: queryKeys.settings.nonDonorThreshold,
    queryFn: () => getNonDonorThreshold(getToken),
  })

  const flaggedManagers = useMemo(() => {
    if (!engagementRows) return []
    const byManager = new Map<string, { managerId: string; managerName: string; assigned: number; donated: number }>()
    for (const row of engagementRows) {
      if (!row.assignedManagerId || !row.managerName) continue
      const existing = byManager.get(row.assignedManagerId)
      if (existing) {
        existing.assigned += 1
        if (row.donated) existing.donated += 1
      } else {
        byManager.set(row.assignedManagerId, {
          managerId: row.assignedManagerId,
          managerName: row.managerName,
          assigned: 1,
          donated: row.donated ? 1 : 0,
        })
      }
    }
    return [...byManager.values()]
      .map((m) => ({
        ...m,
        nonDonor: m.assigned - m.donated,
        rate: m.assigned > 0 ? ((m.assigned - m.donated) / m.assigned) * 100 : 0,
      }))
      .filter((m) => m.rate >= threshold)
      .sort((a, b) => b.rate - a.rate)
  }, [engagementRows, threshold])

  const hasAnyAttention =
    unassignedCount > 0 || overdueCount > 0 || notDonatedCount > 0 || flaggedManagers.length > 0 || incompleteCount > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs Attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!hasAnyAttention && (
          <EmptyState
            icon={<PartyPopper className="size-8" />}
            title="All clear!"
            description="Nothing needs Admin action right now."
          />
        )}

        {unassignedCount > 0 && (
          <AttentionRow
            to="/admin/members?manager=UNASSIGNED"
            tone="destructive"
            icon={UserX}
            count={unassignedCount}
            label={`Member${unassignedCount === 1 ? '' : 's'} Without Manager`}
            description="Require manager assignment"
          />
        )}

        {overdueCount > 0 && (
          <AttentionRow
            to="/admin/followups?tab=overdue"
            tone="destructive"
            icon={ClipboardX}
            count={overdueCount}
            label={`Overdue Follow-up${overdueCount === 1 ? '' : 's'}`}
            description="Follow-ups require action"
          />
        )}

        {notDonatedCount > 0 && (
          <AttentionRow
            to="/admin/reports?tab=engagement&status=notDonated"
            tone="warning"
            icon={IndianRupee}
            count={notDonatedCount}
            label="Haven't Donated Recently"
            description="Review donor activity"
          />
        )}

        {flaggedManagers.length > 0 && (
          <div className="rounded-xl border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
                <Users className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-semibold">
                  <span className="tabular-nums">{flaggedManagers.length}</span> Manager
                  {flaggedManagers.length === 1 ? '' : 's'} With High Non-Donor Count
                </p>
                <p className="text-xs text-muted-foreground">
                  {threshold}%+ of a manager's assigned members haven't donated
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {flaggedManagers.map((m) => (
                <Link
                  key={m.managerId}
                  to={`/admin/reports?tab=engagement&status=notDonated&search=${encodeURIComponent(m.managerName)}`}
                  className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning-foreground transition-colors hover:bg-warning/20"
                >
                  {m.managerName} · {m.nonDonor}/{m.assigned} non-donors
                </Link>
              ))}
            </div>
          </div>
        )}

        {incompleteCount > 0 && (
          <AttentionRow
            to="/admin/members?incomplete=true"
            tone="gold"
            icon={FileWarning}
            count={incompleteCount}
            label="Members With Incomplete Information"
            description="Missing member details"
          />
        )}
      </CardContent>
    </Card>
  )
}
