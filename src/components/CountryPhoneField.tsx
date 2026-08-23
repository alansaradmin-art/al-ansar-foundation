import { useState } from 'react'
import { useFormContext, type FieldPath, type FieldValues } from 'react-hook-form'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { COUNTRIES, countryFlag, findCountry, formatCountryLabel } from '@/lib/countries'
import { cn } from '@/lib/utils'

/** Country + local-number pair, replacing a single free-text phone Input
 * everywhere a number is entered — the user picks a country (searchable,
 * shows "India (+91)"), types only the local number, and the dial code is
 * never guessed. Same Popover+Command combobox shape as MemberPicker.tsx,
 * just filtering the static COUNTRIES list instead of a server search.
 *
 * Must be rendered inside a react-hook-form <Form {...form}> provider —
 * countryField/numberField are that form's own field names (e.g.
 * "mobile_country"/"mobile_number"), so one component serves every call
 * site (Member's mobile, Added By, Reference Contact, Manager's phone,
 * a Follow-up's "Other" contacted person). */
export function CountryPhoneField<TFieldValues extends FieldValues>({
  countryField,
  numberField,
  numberLabel = 'Mobile Number',
}: {
  countryField: FieldPath<TFieldValues>
  numberField: FieldPath<TFieldValues>
  numberLabel?: string
}) {
  const { control } = useFormContext<TFieldValues>()
  const [open, setOpen] = useState(false)

  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2">
      <FormField
        control={control}
        name={countryField}
        render={({ field }) => {
          const selected = findCountry(field.value as string | undefined)
          return (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between px-2 font-normal"
                    >
                      <span className="truncate">
                        {selected ? `${countryFlag(selected.iso2)} +${selected.dialCode}` : 'Select…'}
                      </span>
                      <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0">
                  <Command>
                    <CommandInput placeholder="Search country…" />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        {COUNTRIES.map((country) => (
                          <CommandItem
                            key={country.iso2}
                            value={`${country.name} +${country.dialCode}`}
                            onSelect={() => {
                              field.onChange(country.iso2)
                              setOpen(false)
                            }}
                          >
                            <Check className={cn('size-4', field.value === country.iso2 ? 'opacity-100' : 'opacity-0')} />
                            <span>{countryFlag(country.iso2)}</span>
                            <span className="truncate">{formatCountryLabel(country)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )
        }}
      />
      <FormField
        control={control}
        name={numberField}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{numberLabel}</FormLabel>
            <FormControl>
              <Input
                {...field}
                inputMode="numeric"
                placeholder="Local number, no country code"
                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
