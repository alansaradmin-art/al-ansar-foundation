import { toast } from 'sonner'
import { CheckCircle2, Download } from 'lucide-react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { INSTALL_INSTRUCTIONS } from '@/lib/installInstructions'

/** The full "Install App" surface for Settings (Admin) / More (Manager) —
 * the always-available alternative to the browser's own automatic install
 * prompt, which only ever appears once, on the browser's own schedule,
 * and never at all on iOS Safari. See useInstallPrompt for how the native
 * prompt vs. manual-instructions fallback is decided. */
export function InstallAppCard() {
  const { isInstalled, canPromptInstall, promptInstall, platform } = useInstallPrompt()

  async function handleInstall() {
    const outcome = await promptInstall()
    if (outcome === 'accepted') toast.success('Installing Al Ansar Foundation…')
    else if (outcome === 'dismissed') toast('Installation dismissed.')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Install App</CardTitle>
        <CardDescription>Add Al Ansar Foundation to your home screen for quick, app-like access.</CardDescription>
        {isInstalled && (
          <CardAction>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="size-3.5" /> Already Installed
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {!isInstalled && (
        <CardContent>
          {canPromptInstall ? (
            <Button onClick={handleInstall} className="w-full sm:w-auto">
              <Download className="size-4" /> Install App
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">{INSTALL_INSTRUCTIONS[platform]}</p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
