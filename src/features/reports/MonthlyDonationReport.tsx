import { IndianRupee, Receipt, HandCoins, Sparkles, Wheat, CircleDollarSign } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/StateViews'
import { AnonymousDonationBadge } from '@/components/StatusBadge'
import { DashboardCard } from '@/features/dashboard/DashboardCard'
import { formatDate, formatINR, formatMobileNumber } from '@/lib/format'
import type { DonationReportMemberGroup, DonationReportRow, MonthlyDonationReport as MonthlyDonationReportData } from '@/services/dashboard'

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  ONLINE: 'Online',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
}

const DONATION_TYPE_LABELS: Record<string, string> = {
  ZAKAT: 'Zakat',
  SADAQAH: 'Sadaqah/Sadka',
  FITRA: 'Fitra',
  GENERAL: 'General Donation',
  OTHER: 'Other',
}

function DonationRow({ donation: d }: { donation: DonationReportRow }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="font-medium">{DONATION_TYPE_LABELS[d.donation_type]}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(d.donation_date)} · {PAYMENT_LABELS[d.payment_method]}
          {d.transaction_reference ? ` · Ref: ${d.transaction_reference}` : ''}
        </p>
      </div>
      <span className="shrink-0 font-display font-semibold tabular-nums">{formatINR(d.amount_inr)}</span>
    </li>
  )
}

function MemberDonationCard({ member }: { member: DonationReportMemberGroup }) {
  const subline = [member.memberFatherName, formatMobileNumber(member.memberMobileNumber)].filter(Boolean).join(' · ')
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">
            <Link to={`/admin/members/${member.memberId}`} className="hover:underline">
              {member.memberName}
            </Link>
          </CardTitle>
          {subline && <p className="text-xs text-muted-foreground">{subline}</p>}
        </div>
        <span className="shrink-0 font-display text-lg font-semibold tabular-nums text-primary">
          {formatINR(member.total)}
        </span>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {member.donations.map((d) => (
            <DonationRow key={d.id} donation={d} />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function MonthlyDonationReport({ data }: { data: MonthlyDonationReportData }) {
  const { summary, members, anonymous } = data

  if (summary.totalCount === 0) {
    return <EmptyState icon={<Receipt className="size-8" />} title="No donations recorded for this month." />
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <DashboardCard label="Total Donations" value={summary.totalCount} icon={Receipt} tone="neutral" />
        <DashboardCard label="Total Amount" value={formatINR(summary.totalAmount)} icon={IndianRupee} tone="primary" />
        <DashboardCard label="Zakat" value={formatINR(summary.zakat)} icon={HandCoins} tone="success" />
        <DashboardCard label="Sadaqah/Sadka" value={formatINR(summary.sadaqah)} icon={Sparkles} tone="gold" />
        <DashboardCard label="Fitra" value={formatINR(summary.fitra)} icon={Wheat} tone="info" />
        <DashboardCard label="General/Other" value={formatINR(summary.generalOrOther)} icon={CircleDollarSign} tone="neutral" />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Member-wise Breakdown</h2>
        {members.length === 0 && anonymous.donations.length === 0 ? (
          <EmptyState title="No member donations for this month." />
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <MemberDonationCard key={member.memberId} member={member} />
            ))}

            {anonymous.donations.length > 0 && (
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <AnonymousDonationBadge />
                  <span className="shrink-0 font-display text-lg font-semibold tabular-nums text-primary">
                    {formatINR(anonymous.total)}
                  </span>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {anonymous.donations.map((d) => (
                      <DonationRow key={d.id} donation={d} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
