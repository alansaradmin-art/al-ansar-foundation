import { useState } from 'react'
import { CalendarRange } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDate } from '@/lib/format'

export interface DateRangeValue {
  from: string
  to: string
}

function toDateOnly(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Generic from/to date-range filter — first of its kind in this app.
 * Value/onChange use plain "YYYY-MM-DD" strings (matching the API's
 * dateFrom/dateTo query params) rather than Date objects, so callers never
 * need to think about timezones at the call site. */
export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRangeValue | undefined
  onChange: (value: DateRangeValue | undefined) => void
}) {
  const [open, setOpen] = useState(false)

  const selected: DateRange | undefined = value
    ? { from: parseDateOnly(value.from), to: parseDateOnly(value.to) }
    : undefined

  function handleSelect(range: DateRange | undefined) {
    if (!range?.from) {
      onChange(undefined)
      return
    }
    onChange({ from: toDateOnly(range.from), to: toDateOnly(range.to ?? range.from) })
    if (range.to) setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 font-normal sm:w-64">
          <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
          {value ? (
            <span className="truncate">
              {formatDate(value.from)} – {formatDate(value.to)}
            </span>
          ) : (
            <span className="text-muted-foreground">All dates</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={selected} onSelect={handleSelect} numberOfMonths={2} defaultMonth={selected?.from} />
        {value && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange(undefined)}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
