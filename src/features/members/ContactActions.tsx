import { Phone, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { hasUsablePhone, telHref, whatsappHref } from '@/lib/contact'

export function ContactActions({
  phone,
  name,
  size = 'default',
}: {
  phone: string | null | undefined
  name?: string | null
  size?: 'default' | 'sm'
}) {
  const usable = hasUsablePhone(phone)
  const message = name ? `Assalamu alaikum ${name}, this is Al Ansar Foundation.` : undefined
  const height = size === 'sm' ? 'h-9' : 'h-10'

  return (
    <div className="flex gap-2">
      <Button
        asChild={usable}
        variant="outline"
        disabled={!usable}
        className={cn('flex-1 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary', height)}
      >
        {usable ? (
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
        asChild={usable}
        variant="outline"
        disabled={!usable}
        className={cn('flex-1 border-teal/40 text-teal hover:bg-teal/10 hover:text-teal', height)}
      >
        {usable ? (
          <a href={whatsappHref(phone, message)} target="_blank" rel="noreferrer">
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
