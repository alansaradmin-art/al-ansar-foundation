import { useEffect, useState } from 'react'
import { useClerk } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { FoundationMark } from '@/components/FoundationMark'
import { Button } from '@/components/ui/button'

/** Rendered whenever the signed-in email isn't an authorized Admin/Manager
 * — by that point api/_lib/auth.ts's getOrProvisionProfile (or, for a
 * brand-new sign-up, api/webhooks/clerk.ts) has already rejected and
 * deleted the underlying Clerk user server-side. Signs out automatically
 * on mount ("immediately reject," not waiting on a click) — the button
 * stays as a fallback in case that automatic call fails for any reason. */
export default function UnauthorizedPage() {
  const { signOut } = useClerk()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await signOut()
    } finally {
      queryClient.clear()
      navigate('/login', { replace: true })
    }
  }

  useEffect(() => {
    void handleSignOut()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <FoundationMark />
      <ShieldAlert className="size-8 text-destructive" />
      <div>
        <h1 className="font-semibold">Not authorized</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          You are not authorized to access Al Ansar Foundation. Please contact the administrator.
        </p>
      </div>
      <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
        {isSigningOut ? 'Signing out…' : 'Return to sign in'}
      </Button>
    </div>
  )
}
