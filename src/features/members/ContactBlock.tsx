import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMobileNumber } from '@/lib/format'
import { ContactActions } from './ContactActions'

const TONE_CHIP: Record<'primary' | 'gold' | 'info', string> = {
  primary: 'bg-primary/10 text-primary',
  gold: 'bg-gold/25 text-gold-foreground',
  info: 'bg-teal/15 text-teal',
}

export function ContactBlock({
  label,
  name,
  phone,
  country,
  relationship,
  icon: Icon,
  tone = 'primary',
  whatsappMessage,
  onWhatsAppSend,
}: {
  label: string
  name: string | null | undefined
  phone: string | null | undefined
  /** ISO2 country code paired with phone — see src/lib/countries.ts. */
  country?: string | null
  relationship?: string | null
  icon: LucideIcon
  tone?: 'primary' | 'gold' | 'info'
  /** Passed straight through to ContactActions' message override — see its
   * doc comment. */
  whatsappMessage?: string
  /** Passed straight through to ContactActions — see its doc comment. */
  onWhatsAppSend?: () => void
}) {
  return (
    <div className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', TONE_CHIP[tone])}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium leading-tight">{name || 'Not provided'}</p>
        {relationship && <p className="text-sm text-muted-foreground">{relationship}</p>}
        <p className="text-sm text-muted-foreground">{formatMobileNumber(phone, country) || 'No phone on file'}</p>
        <ContactActions
          phone={phone}
          country={country}
          name={name ?? undefined}
          size="sm"
          message={whatsappMessage}
          onWhatsAppSend={onWhatsAppSend}
        />
      </div>
    </div>
  )
}
