import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useMemberPicker } from '@/hooks/useMembers'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'
import type { Member } from '@/types'

export function MemberPicker({
  value,
  onChange,
  onClear,
}: {
  value: (Pick<Member, 'id' | 'member_name'> & Partial<Pick<Member, 'member_id' | 'father_name'>>) | null
  onChange: (member: Pick<Member, 'id' | 'member_name' | 'member_id' | 'father_name' | 'mobile_number'>) => void
  /** When provided, renders a leading "All members" option that calls this
   * instead of onChange — used when this picker is a filter rather than a
   * required form field. Existing form call sites (MemberForm,
   * RecordDonationDialog) simply don't pass this, so onChange's signature
   * stays unchanged for them. */
  onClear?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const { data: options = [], isLoading } = useMemberPicker(debouncedSearch)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value
            ? value.father_name
              ? `${value.member_name} (${value.father_name})`
              : value.member_name
            : onClear
              ? 'All members'
              : 'Select a member…'}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search members…" value={search} onValueChange={setSearch} />
          <CommandList>
            {!isLoading && <CommandEmpty>No members found.</CommandEmpty>}
            <CommandGroup>
              {onClear && (
                <CommandItem
                  value="__all__"
                  onSelect={() => {
                    onClear()
                    setOpen(false)
                  }}
                >
                  <Check className={cn('size-4', !value ? 'opacity-100' : 'opacity-0')} />
                  All members
                </CommandItem>
              )}
              {options.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.id}
                  onSelect={() => {
                    onChange(member)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('size-4', value?.id === member.id ? 'opacity-100' : 'opacity-0')} />
                  <div>
                    <p>{member.member_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[member.father_name, member.mobile_number].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
