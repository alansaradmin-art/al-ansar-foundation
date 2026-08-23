import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { hasUsableWhatsAppNumber, whatsappHref } from '@/lib/contact'
import { useProfile } from '@/contexts/ProfileContext'
import { buildDonationReminderMessage } from './donationReminderMessage'
import type { Member } from '@/types'

/** Opens WhatsApp with a pre-filled donation-reminder message for this
 * member — purely a "compose and open" action (window.open, not an API
 * call), so it never touches the follow-up record itself. The manager
 * still has to explicitly log the outcome via Add/Update Follow-up
 * afterward, same as if they'd called instead. */
export function WhatsAppReminderButton({
  member,
  variant = 'outline',
  size = 'lg',
  className = 'flex-1',
}: {
  member: Pick<Member, 'member_name' | 'mobile_number'>
  variant?: 'outline' | 'default'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}) {
  const { profile } = useProfile()
  const usable = hasUsableWhatsAppNumber(member.mobile_number)

  if (!usable || !profile) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled
        title="No valid mobile number on file for WhatsApp."
      >
        <MessageCircle className="size-4" /> WhatsApp
      </Button>
    )
  }

  function handleClick() {
    const message = buildDonationReminderMessage(member.member_name, profile!.full_name)
    const url = whatsappHref(member.mobile_number!, message)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={handleClick}>
      <MessageCircle className="size-4" /> WhatsApp
    </Button>
  )
}
