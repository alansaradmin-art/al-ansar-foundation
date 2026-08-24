import { useState } from 'react'
import { useClerk } from '@clerk/clerk-react'
import { LogOut, UserRound } from 'lucide-react'
import { useProfile } from '@/contexts/ProfileContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { InstallAppCard } from '@/components/InstallAppCard'
import { AppFooter } from '@/components/AppFooter'

export default function MorePage() {
  const { profile } = useProfile()
  const { signOut } = useClerk()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await signOut()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="font-display text-lg font-semibold">More</h1>

      <Card className="py-4">
        <CardContent className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{profile?.full_name}</p>
            <p className="truncate text-sm text-muted-foreground">{profile?.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Choose how the app looks on this account.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSwitcher />
        </CardContent>
      </Card>

      <InstallAppCard />

      <Button variant="outline" className="w-full" onClick={handleSignOut} disabled={isSigningOut}>
        <LogOut className="size-4" /> {isSigningOut ? 'Signing out…' : 'Sign out'}
      </Button>

      <AppFooter />
    </div>
  )
}
