import { useState } from 'react'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, Plus, ShieldQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBeneficiaryPicker, useCreateBeneficiary } from '@/hooks/useBeneficiaries'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getFriendlyErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { BeneficiaryOption } from '@/services/beneficiaries'

/** Optional — most expenses (rent, utilities, bank charges) have no
 * beneficiary at all, hence the "None" leading option, matching
 * MemberPicker's onClear pattern for the same reason. */
export function BeneficiaryPicker({
  value,
  onChange,
}: {
  value: BeneficiaryOption | null
  onChange: (beneficiary: BeneficiaryOption | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(search)
  const { data: options = [], isLoading } = useBeneficiaryPicker(debouncedSearch)

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
            {value ? (value.is_confidential ? 'Confidential Beneficiary' : value.display_name) : 'None (operational expense)'}
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search beneficiaries…" value={search} onValueChange={setSearch} />
            <CommandList>
              {!isLoading && <CommandEmpty>No beneficiaries found.</CommandEmpty>}
              <CommandGroup>
                <CommandItem value="__none__" onSelect={() => (onChange(null), setOpen(false))}>
                  <Check className={cn('size-4', !value ? 'opacity-100' : 'opacity-0')} />
                  None (operational expense)
                </CommandItem>
                {options.map((b) => (
                  <CommandItem key={b.id} value={b.id} onSelect={() => (onChange(b), setOpen(false))}>
                    <Check className={cn('size-4', value?.id === b.id ? 'opacity-100' : 'opacity-0')} />
                    {b.is_confidential ? (
                      <span className="flex items-center gap-1.5">
                        <ShieldQuestion className="size-3.5 text-muted-foreground" /> Confidential Beneficiary
                      </span>
                    ) : (
                      <div>
                        <p>{b.display_name}</p>
                        {b.phone && <p className="text-xs text-muted-foreground">{b.phone}</p>}
                      </div>
                    )}
                  </CommandItem>
                ))}
                <CommandItem
                  value="__new__"
                  onSelect={() => {
                    setOpen(false)
                    setCreateOpen(true)
                  }}
                >
                  <Plus className="size-4" /> Add a new beneficiary
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <NewBeneficiaryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(beneficiary) => onChange(beneficiary)}
      />
    </>
  )
}

function NewBeneficiaryDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (beneficiary: BeneficiaryOption) => void
}) {
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [isConfidential, setIsConfidential] = useState(false)
  const { mutate, isPending } = useCreateBeneficiary()

  function reset() {
    setDisplayName('')
    setPhone('')
    setIsConfidential(false)
  }

  function handleSubmit() {
    if (!isConfidential && !displayName.trim()) {
      toast.error('Name is required unless this beneficiary is confidential.')
      return
    }
    mutate(
      { is_confidential: isConfidential, display_name: displayName, phone, address: '', notes: '' },
      {
        onSuccess: (beneficiary) => {
          toast.success('Beneficiary added.')
          onCreated({ id: beneficiary.id, display_name: beneficiary.display_name, phone: beneficiary.phone, is_confidential: beneficiary.is_confidential })
          onOpenChange(false)
          reset()
        },
        onError: (error) => toast.error(getFriendlyErrorMessage(error, 'Unable to add this beneficiary.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (onOpenChange(next), !next && reset())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Beneficiary</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={isConfidential}
              onChange={(e) => setIsConfidential(e.target.checked)}
            />
            Keep this beneficiary confidential (no name or phone stored)
          </label>
          {!isConfidential && (
            <>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Beneficiary name" />
              </div>
              <div className="space-y-2">
                <Label>Phone (optional)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Adding…' : 'Add Beneficiary'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
