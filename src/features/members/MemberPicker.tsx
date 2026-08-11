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
}: {
  value: (Pick<Member, 'id' | 'member_name'> & Partial<Pick<Member, 'member_id'>>) | null
  onChange: (member: Pick<Member, 'id' | 'member_name' | 'member_id' | 'mobile_number'>) => void
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
          {value ? (value.member_id ? `${value.member_name} (${value.member_id})` : value.member_name) : 'Select a member…'}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search members…" value={search} onValueChange={setSearch} />
          <CommandList>
            {!isLoading && <CommandEmpty>No members found.</CommandEmpty>}
            <CommandGroup>
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
                      {member.member_id}
                      {member.mobile_number ? ` · ${member.mobile_number}` : ''}
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
