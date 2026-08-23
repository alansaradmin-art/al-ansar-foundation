import { Phone, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { hasUsablePhone, hasUsableWhatsAppNumber, telHref, whatsappHref } from '@/lib/contact'

export function ContactActions({
  phone,
  country,
  name,
  size = 'default',
  message: messageOverride,
}: {
  phone: string | null | undefined
  /** ISO2 country code paired with phone — see src/lib/countries.ts. A
   * legacy row with no stored country still resolves via the old
   * length-guess fallback inside hasUsableWhatsAppNumber/whatsappHref. */
  country?: string | null
  name?: string | null
  size?: 'default' | 'sm'
  /** Overrides the default generic greeting — used for a member's own
   * contact block plus Added By/Reference Contact (ContactSection.tsx,
   * FamilyInformationCard.tsx, PendingMemberCard.tsx), each of which passes
   * its own personalized donation-reminder template (see
   * donationReminderMessage.ts). Assigned Manager is the only caller that
   * still uses the generic greeting below — there's no reminder template
   * addressed to a manager. */
  message?: string
}) {
  const callUsable = hasUsablePhone(phone)
  const message = messageOverride ?? (name ? `Assalamu alaikum ${name}, this is Al Ansar Foundation.` : undefined)
  // hasUsableWhatsAppNumber is the real gate (stricter than callUsable — see
  // its doc comment); whatsappUrl is only non-null once that's already true,
  // but TypeScript can't see that across the two calls.
  const whatsappUrl = hasUsableWhatsAppNumber(phone, country) ? whatsappHref(phone!, country, message) : null
  const height = size === 'sm' ? 'h-9' : 'h-10'

  return (
    <div className="flex gap-2">
      <Button
        asChild={callUsable}
        variant="outline"
        disabled={!callUsable}
        className={cn('flex-1 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary', height)}
      >
        {callUsable ? (
          <a href={telHref(phone)}>
            <Phone className="size-4" /> Call
          </a>
        ) : (
          <span>
            <Phone className="size-4" /> Call
          </span>
        )}
      </Button>
      <Button
        asChild={!!whatsappUrl}
        variant="outline"
        disabled={!whatsappUrl}
        className={cn('flex-1 border-teal/40 text-teal hover:bg-teal/10 hover:text-teal', height)}
      >
        {whatsappUrl ? (
          <a href={whatsappUrl} target="_blank" rel="noreferrer">
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        ) : (
          <span>
            <MessageCircle className="size-4" /> WhatsApp
          </span>
        )}
      </Button>
    </div>
  )
}
