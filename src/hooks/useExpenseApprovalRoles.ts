import { useAuth } from '@clerk/clerk-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { queryKeys } from '@/lib/queryKeys'
import { getExpenseApprovalRoles, setExpenseApprovalRoles } from '@/services/settings'
import { getFriendlyErrorMessage } from '@/lib/errors'

/** Bundles the read + local-draft-state + save flow, mirroring every other
 * setting on SettingsPage.tsx (query -> local state -> handleSave). Kept
 * as its own hook (rather than inlined in the settings page) since the new
 * Expense Committee section lives in its own component. */
export function useExpenseApprovalRolesSetting() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const { data: roles, isLoading } = useQuery({
    queryKey: queryKeys.settings.expenseApprovalRoles,
    queryFn: () => getExpenseApprovalRoles(getToken),
  })

  const [draft, setDraft] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (roles) setDraft(roles)
  }, [roles])

  async function save(next: string[]) {
    setSaving(true)
    try {
      await setExpenseApprovalRoles(getToken, next)
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.expenseApprovalRoles })
      toast.success('Committee roles updated.')
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Unable to save this setting.'))
    } finally {
      setSaving(false)
    }
  }

  return { roles: roles ?? [], isLoading, draft, setDraft, save, saving }
}
