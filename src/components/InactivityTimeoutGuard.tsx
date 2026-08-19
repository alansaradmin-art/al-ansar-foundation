import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const TIMEOUT_MS = 5 * 60 * 1000
const WARNING_MS = 30 * 1000
const STORAGE_KEY = 'al-ansar-last-activity'
// Deliberately DOM input events only — a TanStack Query background refetch
// or polling interval never dispatches any of these, so it can never count
// as activity without extra (unwanted) wiring.
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'click', 'touchstart', 'scroll'] as const
const ACTIVITY_WRITE_THROTTLE_MS = 1000

/** Auto-signs the user out after 5 minutes of inactivity, with a 30-second
 * warning first. Mounted once by RequireAuth.tsx (a route element that
 * stays mounted for the whole authenticated session — its children swap
 * via <Outlet/>, but RequireAuth itself doesn't remount on navigation), so
 * there is exactly one timer for the whole app regardless of how many
 * pages are visited; unmounts (and cleans up every listener/timer) the
 * moment the user is no longer authenticated.
 *
 * Cross-tab: the last-activity timestamp is mirrored to localStorage
 * (throttled) and read back via the `storage` event, so activity in any
 * open tab resets every other open tab's countdown too — a manager
 * actively working in one tab never gets silently logged out in another
 * idle tab while they're still using the app. */
export function InactivityTimeoutGuard() {
  const { signOut } = useClerk()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  const lastActivityRef = useRef(Date.now())
  const lastWrittenRef = useRef(0)
  const isSigningOutRef = useRef(false)
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null)

  // Stable across the component's lifetime (no deps) — only touches refs
  // and a state setter, so the effect below that wires up listeners never
  // needs to tear down and re-attach them.
  const recordActivity = useCallback(() => {
    const now = Date.now()
    lastActivityRef.current = now
    // Fresh activity always clears an in-progress warning — React no-ops
    // the update on the common case where it's already null.
    setSecondsRemaining(null)

    if (now - lastWrittenRef.current < ACTIVITY_WRITE_THROTTLE_MS) return
    lastWrittenRef.current = now
    try {
      localStorage.setItem(STORAGE_KEY, String(now))
    } catch {
      // Private-browsing/storage-disabled — activity tracking still works
      // within this tab via the ref; only cross-tab sync is lost.
    }
  }, [])

  const handleTimeout = useCallback(async () => {
    if (isSigningOutRef.current) return
    isSigningOutRef.current = true
    try {
      // Clerk's official sign-out — never delete sessions/tokens manually.
      await signOut()
    } finally {
      // Drop every cached Supabase query result so nothing from this
      // session lingers for whoever signs in next on this device — same
      // cleanup LogoutDialog does for a manual logout.
      queryClient.clear()
      navigate('/login', { replace: true })
    }
  }, [signOut, queryClient, navigate])

  useEffect(() => {
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, recordActivity, { passive: true })
    }

    function handleStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      const otherTabActivity = Number(e.newValue)
      if (Number.isFinite(otherTabActivity) && otherTabActivity > lastActivityRef.current) {
        lastActivityRef.current = otherTabActivity
        setSecondsRemaining(null)
      }
    }
    window.addEventListener('storage', handleStorage)

    // A single persistent interval reads the ref each tick, rather than a
    // fresh setTimeout scheduled per activity event — one timer for the
    // component's entire lifetime, so there's nothing to accidentally
    // leave running twice.
    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      if (elapsed >= TIMEOUT_MS) {
        setSecondsRemaining(0)
        void handleTimeout()
        return
      }
      if (elapsed >= TIMEOUT_MS - WARNING_MS) {
        setSecondsRemaining(Math.max(0, Math.ceil((TIMEOUT_MS - elapsed) / 1000)))
      }
    }, 1000)

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, recordActivity)
      }
      window.removeEventListener('storage', handleStorage)
      window.clearInterval(intervalId)
    }
  }, [recordActivity, handleTimeout])

  // Navigating between pages counts as activity too.
  useEffect(() => {
    recordActivity()
  }, [location.pathname, recordActivity])

  return (
    <AlertDialog open={secondsRemaining !== null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You'll be signed out in {secondsRemaining ?? 0} second{secondsRemaining === 1 ? '' : 's'} due to
            inactivity.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={recordActivity}>Stay Logged In</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
