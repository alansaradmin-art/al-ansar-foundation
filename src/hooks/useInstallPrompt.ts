import { useCallback, useEffect, useState } from 'react'

/** Chrome/Edge/Android's native install prompt — not in lib.dom.d.ts, since
 * it's a non-standard event only those browsers fire. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type InstallPlatform = 'ios' | 'android' | 'desktop'

function detectPlatform(): InstallPlatform {
  const ua = navigator.userAgent
  // iPadOS 13+ Safari reports itself as a Mac in its UA string — real Macs
  // have no touch points, so that combination is the standard way to tell
  // them apart.
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (/iPhone|iPod|iPad/.test(ua) || isIPadOS) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

function detectStandalone(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari's legacy flag — display-mode standalone-query support has
  // historically been inconsistent across iOS versions, this is the more
  // reliable check there specifically.
  return !!(navigator as Navigator & { standalone?: boolean }).standalone
}

/** Wraps the browser's native "beforeinstallprompt" flow so it can be
 * triggered from anywhere in the UI (Settings, the account menu) instead
 * of only ever appearing as the browser's own automatic mini-infobar —
 * which the browser shows at most once, on its own schedule, and never at
 * all on iOS Safari or once its own "don't nag" cooldown kicks in.
 * Callers must always have a fallback for canPromptInstall === false —
 * see platform, which is what InstallAppCard/InstallAppMenuItem use to
 * show manual per-platform instructions instead. */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(detectStandalone)
  const [platform] = useState<InstallPlatform>(detectPlatform)

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      // Suppresses the browser's own automatic mini-infobar so this app's
      // UI is what decides when to show the prompt instead.
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    function handleAppInstalled() {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable'
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    // A captured prompt event can only ever be used once — spent either
    // way, so the UI falls back to manual instructions on a retry rather
    // than showing a button that silently does nothing.
    setDeferredPrompt(null)
    return outcome
  }, [deferredPrompt])

  return {
    isInstalled,
    canPromptInstall: !!deferredPrompt && !isInstalled,
    promptInstall,
    platform,
  }
}
