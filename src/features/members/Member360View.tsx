import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { differenceInCalendarMonths } from 'date-fns'
import { ArrowLeft, UserRound, IdCard, IndianRupee, ClipboardList, History, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardListSkeleton } from '@/components/LoadingSkeletons'
import { EmptyState } from '@/components/StateViews'
import { MemberStatusBadge } from '@/components/StatusBadge'
import { MemberInfoCard } from './MemberInfoCard'
import { ContactSection } from './ContactSection'
import { FamilyInformationCard } from './FamilyInformationCard'
import { AuditInformationCard } from './AuditInformationCard'
import { AssignedManagerCard } from './AssignedManagerCard'
import { FinancialSummaryCard } from '@/features/donations/FinancialSummaryCard'
import { DonationTrendChart } from '@/features/donations/DonationTrendChart'
import { DonationHistoryList } from '@/features/donations/DonationHistoryList'
import { FollowupHistoryList } from '@/features/followups/FollowupHistoryList'
import { AuditLogEntry } from '@/features/auditLogs/AuditLogEntry'
import { DocumentsSection } from '@/features/documents/DocumentsSection'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import { queryKeys } from '@/lib/queryKeys'
import { formatDate } from '@/lib/format'
import type { Donation, Member, MonthlyFollowup } from '@/types'

/** The single shared Member 360 body, rendered by both
 * admin/MemberDetailPage.tsx and manager/MemberDetailPage.tsx — role-specific
 * bits (which actions are available) stay as props owned by the two page
 * wrappers, not baked in here, so this component doesn't need to know who's
 * looking at it beyond what it's given permission to show. */
export function Member360View({
  member,
  donations,
  isDonationsLoading,
  followups,
  isFollowupsLoading,
  canDeleteDocuments,
  canEditFollowups = false,
  headerActions,
  bottomActions,
  periodSummary,
}: {
  member: Member
  donations: Donation[]
  isDonationsLoading: boolean
  followups: MonthlyFollowup[]
  isFollowupsLoading: boolean
  canDeleteDocuments: boolean
  /** Only the Manager page passes this true — there is no admin follow-up
   * editing path, matching create's manager-only rule. */
  canEditFollowups?: boolean
  headerActions?: ReactNode
  bottomActions?: ReactNode
  /** Manager's existing period-scoped MonthlyDonationSummary (with its own
   * month/year picker) — a genuinely different view (a specific chosen
   * period) than FinancialSummaryCard/DonationTrendChart's always-current
   * stats, so it stays as an owned slot rather than being folded in. */
  periodSummary?: ReactNode
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const memberId = member.id

  const { data: auditLogs, isLoading: isTimelineLoading } = useAuditLogs({ memberId, pageSize: 20 })

  // donations is sorted donation_date desc and excludes deleted rows (see
  // api/donations.ts's ?action=forMember), so [0] is the latest valid
  // donation, if any.
  const latestDonationDate = donations[0]?.donation_date
  const monthsInactive = differenceInCalendarMonths(new Date(), new Date(latestDonationDate ?? member.created_at))

  function handleTabChange(value: string) {
    if (value === 'donations') {
      queryClient.invalidateQueries({ queryKey: queryKeys.donations.forMember(memberId) })
    }
    if (value === 'followups') {
      queryClient.invalidateQueries({ queryKey: queryKeys.followups.forMember(memberId) })
    }
    if (value === 'timeline') {
      queryClient.invalidateQueries({ queryKey: ['audit-logs', 'list'] })
    }
    if (value === 'documents') {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.forMember(memberId) })
    }
  }

  return (
    <div className={bottomActions ? 'pb-32' : undefined}>
      <div className="flex flex-wrap items-start gap-3 p-4 pb-0">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
        </Button>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-lg font-semibold leading-tight">{member.member_name}</h1>
            <MemberStatusBadge status={member.status} />
          </div>
          {member.father_name && <p className="text-xs text-muted-foreground">{member.father_name}</p>}
          {member.status === 'INACTIVE' && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {latestDonationDate ? `Last donation: ${formatDate(latestDonationDate)}` : 'Never donated'} ·{' '}
              {monthsInactive} month{monthsInactive === 1 ? '' : 's'} inactive
            </p>
          )}
        </div>
        {headerActions && <div className="flex shrink-0 flex-wrap gap-2">{headerActions}</div>}
      </div>

      <Tabs defaultValue="overview" className="mt-3 gap-0" onValueChange={handleTabChange}>
        <div className="sticky top-14 z-10 border-b bg-background/95 px-4 py-2 backdrop-blur">
          {/* 5 tabs' full labels don't fit a phone-width bar (whitespace-nowrap
           * on TabsTrigger blocks shrinking below content size) — text
           * collapses to icon-only below sm, avoiding both squished labels
           * and a horizontal-scroll tab bar. aria-label keeps each tab
           * announced correctly once the visible text is hidden. */}
          <TabsList className="w-full">
            <TabsTrigger value="overview" aria-label="Overview">
              <IdCard className="size-4" /> <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="donations" aria-label="Donations">
              <IndianRupee className="size-4" /> <span className="hidden sm:inline">Donations</span>
            </TabsTrigger>
            <TabsTrigger value="followups" aria-label="Follow-ups">
              <ClipboardList className="size-4" /> <span className="hidden sm:inline">Follow-ups</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" aria-label="Timeline">
              <History className="size-4" /> <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="documents" aria-label="Documents">
              <FileText className="size-4" /> <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4 p-4">
          <MemberInfoCard member={member} />
          <ContactSection member={member} hideMemberWhatsApp={!!bottomActions} />
          <FamilyInformationCard member={member} />
          <AssignedManagerCard managerId={member.assigned_manager_id} />
          {isDonationsLoading ? <CardListSkeleton count={2} /> : <FinancialSummaryCard donations={donations} />}
          <AuditInformationCard member={member} />
        </TabsContent>

        <TabsContent value="donations" className="space-y-4 p-4">
          {periodSummary}
          {isDonationsLoading ? (
            <CardListSkeleton count={2} />
          ) : (
            <>
              <DonationTrendChart donations={donations} />
              <DonationHistoryList donations={donations} />
            </>
          )}
        </TabsContent>

        <TabsContent value="followups" className="space-y-4 p-4">
          {isFollowupsLoading ? (
            <CardListSkeleton count={2} />
          ) : (
            <FollowupHistoryList followups={followups} member={member} canEdit={canEditFollowups} />
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-3 p-4">
          {isTimelineLoading ? (
            <CardListSkeleton count={3} />
          ) : !auditLogs || auditLogs.rows.length === 0 ? (
            <EmptyState title="No activity recorded for this member yet." icon={<History className="size-6" />} />
          ) : (
            auditLogs.rows.map((log) => <AuditLogEntry key={log.id} log={log} hideMemberInfo />)
          )}
        </TabsContent>

        <TabsContent value="documents" className="p-4">
          <DocumentsSection memberId={memberId} canDelete={canDeleteDocuments} />
        </TabsContent>
      </Tabs>

      {bottomActions && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap gap-2 border-t bg-background/95 p-3 shadow-lg backdrop-blur">
          {bottomActions}
        </div>
      )}
    </div>
  )
}

