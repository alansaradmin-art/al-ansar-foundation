import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { hasUsableWhatsAppNumber, whatsappHref } from '@/lib/contact'

/** A single "message this person" WhatsApp action — purely a "compose and
 * open" action (window.open, not an API call), so it never touches the
 * follow-up record itself; the manager still has to explicitly log the
 * outcome via Add/Update Follow-up afterward. Used for all three Follow-up
 * section WhatsApp actions (Member/Added By/Reference Contact — see
 * FollowupWhatsAppActions) with a different label/phone/message each. */
export function WhatsAppActionButton({
  label,
  phone,
  message,
  variant = 'outline',
  size = 'lg',
  className = 'flex-1',
}: {
  label: string
  phone: string | null | undefined
  message: string
  variant?: 'outline' | 'default'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}) {
  const usable = hasUsableWhatsAppNumber(phone)

  if (!usable) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled
        title="No phone on file for WhatsApp."
      >
        <MessageCircle className="size-4" /> No phone on file
      </Button>
    )
  }

  function handleClick() {
    const url = whatsappHref(phone!, message)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={handleClick}>
      <MessageCircle className="size-4" /> {label}
    </Button>
  )
}
