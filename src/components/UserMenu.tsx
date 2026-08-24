import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { LogOut } from 'lucide-react'
import { useProfile } from '@/contexts/ProfileContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogoutDialog } from './LogoutDialog'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

/**
 * Replaces Clerk's prebuilt <UserButton/> — same trigger/menu pattern, but
 * styled to match the rest of the app and sourcing name/email/role from the
 * Supabase profile (the authorization source of truth), not Clerk metadata.
 */
export function UserMenu() {
  const { user } = useUser()
  const { profile, isAdmin } = useProfile()
  const [logoutOpen, setLogoutOpen] = useState(false)

  const name = profile?.full_name || user?.fullName || 'Account'
  const email = profile?.email || user?.primaryEmailAddress?.emailAddress || ''
  const roleLabel = isAdmin ? 'Admin' : 'Manager'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Avatar className="size-8">
              <AvatarImage src={user?.imageUrl} alt={name} />
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <Avatar className="size-10">
              <AvatarImage src={user?.imageUrl} alt={name} />
              <AvatarFallback className="bg-primary/10 font-semibold text-primary">{initials(name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <div className="px-2 pb-1.5 pt-1">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {roleLabel}
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setLogoutOpen(true)}>
            <LogOut className="size-4" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  )
}
