import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FoundationMark } from '@/components/FoundationMark'
import { Button } from '@/components/ui/button'

/** TEMPORARY diagnostic — a "Page not found" that keeps reproducing after
 * two rounds of fixes needs to show exactly what URL/state it's actually
 * landing on, since that can't easily be read from a device's own
 * DevTools (iPhone Safari with no Mac to remote-debug from). Remove once
 * diagnosed. */
function DebugInfo() {
  const [swController, setSwController] = useState<string | null>('checking…')

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setSwController('unsupported')
      return
    }
    setSwController(navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : 'none')
  }, [])

  return (
    <div className="mt-4 max-w-full space-y-1 rounded-lg border bg-muted/40 p-3 text-left text-[11px] break-all text-muted-foreground">
      <p>href: {window.location.href}</p>
      <p>referrer: {document.referrer || '(none)'}</p>
      <p>sw controller: {swController}</p>
      <p>history length: {window.history.length}</p>
    </div>
  )
}

export default function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <FoundationMark />
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Button asChild>
        <Link to="/">Go home</Link>
      </Button>
      <DebugInfo />
    </div>
  )
}
