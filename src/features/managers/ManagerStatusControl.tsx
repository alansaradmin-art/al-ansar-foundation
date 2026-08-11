import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSetManagerStatus, useManagers } from '@/hooks/useManagers'
import { useMembers, useReassignManager } from '@/hooks/useMembers'
import { useSupabaseClient } from '@/contexts/SupabaseContext'
import { countMembersForManager } from '@/services/members'
import { getFriendlyErrorMessage } from '@/lib/errors'
import { useQuery } from '@tanstack/react-query'
import type { Manager } from '@/types'

export function ManagerStatusControl({ manager }: { manager: Manager }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reassignTarget, setReassignTarget] = useState('')
  const client = useSupabaseClient()
  const { mutate: setStatus, isPending: isTogglingStatus } = useSetManagerStatus()
  const { mutate: reassign, isPending: isReassigning } = useReassignManager()
  const { data: otherManagers = [] } = useManagers({ status: 'ACTIVE' })
  const { data: affectedMembers } = useMembers({ managerId: manager.id, status: 'ACTIVE', pageSize: 200 })

  const { data: affectedCount } = useQuery({
    queryKey: ['manager-active-member-count', manager.id],
    queryFn: () => countMembersForManager(client, manager.id),
    enabled: confirmOpen,
  })

  function handleActivate() {
    setStatus(
      { id: manager.id, status: 'ACTIVE' },
      {
        onSuccess: () => toast.success('Manager activated.'),
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to update manager status.')),
      },
    )
  }

  function handleDeactivate() {
    if (!reassignTarget) {
      setStatus(
        { id: manager.id, status: 'INACTIVE' },
        {
          onSuccess: () => {
            toast.success('Manager deactivated.')
            setConfirmOpen(false)
          },
          onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to update manager status.')),
        },
      )
      return
    }

    const memberIds = affectedMembers?.rows.map((m) => m.id) ?? []
    reassign(
      { memberIds, managerId: reassignTarget },
      {
        onSuccess: () => {
          setStatus(
            { id: manager.id, status: 'INACTIVE' },
            {
              onSuccess: () => {
                toast.success(`Reassigned ${memberIds.length} member(s) and deactivated the manager.`)
                setConfirmOpen(false)
                setReassignTarget('')
              },
              onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to update manager status.')),
            },
          )
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to reassign members.')),
      },
    )
  }

  if (manager.status === 'INACTIVE') {
    return (
      <Button variant="outline" size="sm" disabled={isTogglingStatus} onClick={handleActivate}>
        Activate
      </Button>
    )
  }

  const reassignCandidates = otherManagers.filter((m) => m.id !== manager.id)

  return (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          Deactivate
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate {manager.full_name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {affectedCount === undefined
              ? 'Checking assigned members…'
              : affectedCount > 0
                ? `This manager has ${affectedCount} active member(s) assigned. Choose another manager to reassign them to before deactivating.`
                : 'This manager has no active members assigned.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!!affectedCount && (
          <Select value={reassignTarget} onValueChange={setReassignTarget}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Reassign members to…" />
            </SelectTrigger>
            <SelectContent>
              {reassignCandidates.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={(!!affectedCount && !reassignTarget) || isTogglingStatus || isReassigning}
            onClick={(e) => {
              e.preventDefault()
              handleDeactivate()
            }}
          >
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
