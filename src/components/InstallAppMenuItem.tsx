import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { INSTALL_INSTRUCTIONS } from '@/lib/installInstructions'

/** The account-menu alternative to InstallAppCard (Settings/More) — same
 * useInstallPrompt logic, compact enough for a dropdown item. Hidden
 * entirely once installed, since "already installed" status has a home in
 * Settings/More and doesn't need repeating in every menu open. */
export function InstallAppMenuItem() {
  const { isInstalled, canPromptInstall, promptInstall, platform } = useInstallPrompt()

  if (isInstalled) return null

  async function handleSelect() {
    if (canPromptInstall) {
      const outcome = await promptInstall()
      if (outcome === 'accepted') toast.success('Installing Al Ansar Foundation…')
      return
    }
    toast.info('Install this app', { description: INSTALL_INSTRUCTIONS[platform] })
  }

  return (
    <DropdownMenuItem onSelect={handleSelect}>
      <Download className="size-4" /> Install App
    </DropdownMenuItem>
  )
}
