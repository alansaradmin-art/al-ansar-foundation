import { Link } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'
import { ClipboardList, LogOut, ChevronRight, UserRound } from 'lucide-react'
import { useProfile } from '@/contexts/ProfileContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function MorePage() {
  const { profile } = useProfile()
  const { signOut } = useClerk()

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

      <Link
        to="/manager/followups"
        className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
      >
        <span className="flex items-center gap-3">
          <ClipboardList className="size-4 text-muted-foreground" />
          Follow-up History
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>

      <Button variant="outline" className="w-full" onClick={() => signOut()}>
        <LogOut className="size-4" /> Sign out
      </Button>
    </div>
  )
}
