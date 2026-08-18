import { useState } from 'react'
import { useClerk, useUser } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Hourglass } from 'lucide-react'
import { FoundationMark } from '@/components/FoundationMark'
import { Button } from '@/components/ui/button'

export default function WaitingForSetupPage() {
  const { user } = useUser()
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

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <FoundationMark />
      <Hourglass className="size-8 text-muted-foreground" />
      <div>
        <h1 className="font-semibold">Account not set up yet</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          You&apos;re signed in as {user?.primaryEmailAddress?.emailAddress}, but the Foundation Admin hasn&apos;t
          linked this email to a manager profile yet. Please check with the Admin.
        </p>
      </div>
      <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
        {isSigningOut ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  )
}
