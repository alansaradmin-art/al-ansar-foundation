import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useManagers } from '@/hooks/useManagers'
import { useReassignManager } from '@/hooks/useMembers'
import { getFriendlyErrorMessage } from '@/lib/errors'
import type { Member } from '@/types'

export function AssignManagerDialog({ member }: { member: Pick<Member, 'id' | 'member_name'> }) {
  const [open, setOpen] = useState(false)
  const [managerId, setManagerId] = useState('')
  const { data: managers = [] } = useManagers({ status: 'ACTIVE' })
  const { mutate, isPending } = useReassignManager()

  function handleAssign() {
    if (!managerId) return
    mutate(
      { memberIds: [member.id], managerId },
      {
        onSuccess: () => {
          toast.success(`${member.member_name} assigned to a manager.`)
          setOpen(false)
          setManagerId('')
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to assign manager.')),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setManagerId('')
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="size-4" /> Assign Manager
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Manager</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Manager</Label>
            {managers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active managers available.</p>
            ) : (
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button className="w-full" disabled={!managerId || isPending} onClick={handleAssign}>
            {isPending ? 'Assigning…' : 'Assign'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
