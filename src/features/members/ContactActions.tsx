import { Phone, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { hasUsablePhone, hasUsableWhatsAppNumber, telHref, whatsappHref } from '@/lib/contact'

export function ContactActions({
  phone,
  name,
  size = 'default',
  message: messageOverride,
  showWhatsApp = true,
}: {
  phone: string | null | undefined
  name?: string | null
  size?: 'default' | 'sm'
  /** Overrides the default generic greeting — used for the member's own
   * contact block (ContactSection.tsx, PendingMemberCard.tsx), which sends
   * the same donation-reminder message as the dedicated Follow-up section
   * WhatsApp action (WhatsAppReminderButton) rather than a generic
   * greeting, since this is the same "message the member" action just
   * reachable from a second location. Added-By/Reference-Contact/Assigned-
   * Manager keep the generic greeting — the reminder text is written from
   * the member's own donation, so it wouldn't make sense addressed to
   * someone else. */
  message?: string
  /** False wherever a dedicated WhatsAppReminderButton already covers the
   * same "message this member" action nearby (PendingMemberCard's action
   * row, Member 360's Manager bottom bar) — showing both is a redundant
   * second icon for the identical action. Call has no such duplicate, so
   * it's never hidden. */
  showWhatsApp?: boolean
}) {
  const callUsable = hasUsablePhone(phone)
  const message = messageOverride ?? (name ? `Assalamu alaikum ${name}, this is Al Ansar Foundation.` : undefined)
  // hasUsableWhatsAppNumber is the real gate (stricter than callUsable — see
  // its doc comment); whatsappUrl is only non-null once that's already true,
  // but TypeScript can't see that across the two calls.
  const whatsappUrl = hasUsableWhatsAppNumber(phone) ? whatsappHref(phone!, message) : null
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
      {showWhatsApp && (
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
      )}
    </div>
  )
}
