import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState, EmptyState } from '@/components/StateViews'
import { useActiveFinancialRoleGrants, useGrantFinancialRole, useRevokeFinancialRole } from '@/hooks/useFinancialRoles'
import { useExpenseApprovalRolesSetting } from '@/hooks/useExpenseApprovalRoles'
import { useAuditLogActors } from '@/hooks/useAuditLogs'
import { getFriendlyErrorMessage } from '@/lib/errors'
import { FINANCIAL_ROLE_CODES, FINANCIAL_ROLE_LABELS } from './financialRoleLabels'
import type { FinancialRoleCode } from '@/types'

/** Committee membership (§E of the Expense Management Plan): who holds
 * which financial role, and which of those roles are required for expense
 * approval quorum (§F). Two independent controls on one card — a role can
 * be granted to someone without being part of the required quorum set
 * (e.g. a President who should see reports but isn't a required signer). */
export function ExpenseCommitteeSection() {
  return (
    <div className="space-y-4">
      <QuorumRolesCard />
      <GrantsCard />
    </div>
  )
}

function QuorumRolesCard() {
  const { draft, setDraft, save, saving, isLoading } = useExpenseApprovalRolesSetting()

  function toggle(role: FinancialRoleCode) {
    setDraft((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Required for Approval Quorum</CardTitle>
        <CardDescription>
          Every role checked here must sign off before an expense reaches Approved. A role can be granted to someone
          without being required here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <LoadingState label="Loading…" />
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              {FINANCIAL_ROLE_CODES.map((role) => (
                <label key={role} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-primary" checked={draft.includes(role)} onChange={() => toggle(role)} />
                  {FINANCIAL_ROLE_LABELS[role]}
                </label>
              ))}
            </div>
            <Button onClick={() => save(draft)} disabled={saving || draft.length === 0}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function GrantsCard() {
  const { data: grants = [], isLoading } = useActiveFinancialRoleGrants()
  const { data: profiles = [] } = useAuditLogActors()
  const { mutate: grant, isPending: isGranting } = useGrantFinancialRole()
  const { mutate: revoke } = useRevokeFinancialRole()
  const [profileId, setProfileId] = useState('')
  const [roleCode, setRoleCode] = useState<FinancialRoleCode | ''>('')

  function handleGrant() {
    if (!profileId || !roleCode) {
      toast.error('Select both a person and a role.')
      return
    }
    grant(
      { profileId, roleCode },
      {
        onSuccess: () => {
          toast.success('Role granted.')
          setProfileId('')
          setRoleCode('')
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to grant this role.')),
      },
    )
  }

  function handleRevoke(id: string) {
    revoke(id, {
      onSuccess: () => toast.success('Role revoked.'),
      onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to revoke this role.')),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Committee Members</CardTitle>
        <CardDescription>
          Financial roles stack on top of someone's existing Admin or Manager access — granting Treasurer to a
          Manager doesn't change anything about how they manage their own members.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select a person" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name} ({p.role === 'ADMIN' ? 'Admin' : 'Manager'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Select value={roleCode} onValueChange={(v) => setRoleCode(v as FinancialRoleCode)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {FINANCIAL_ROLE_CODES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {FINANCIAL_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGrant} disabled={isGranting}>
            Grant
          </Button>
        </div>

        {isLoading ? (
          <LoadingState label="Loading…" />
        ) : grants.length === 0 ? (
          <EmptyState title="No financial roles granted yet." />
        ) : (
          <ul className="divide-y">
            {grants.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-medium">{g.profile?.full_name ?? 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.profile?.role === 'ADMIN' ? 'Admin' : 'Manager'}
                    {g.profile && !g.profile.is_active && ' · Deactivated'}
                  </p>
                </div>
                <Badge variant="secondary">{FINANCIAL_ROLE_LABELS[g.role_code]}</Badge>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRevoke(g.id)}>
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
