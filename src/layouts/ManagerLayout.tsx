import { NavLink, Outlet } from 'react-router-dom'
import { Home, Users, ClipboardList, IndianRupee, MoreHorizontal } from 'lucide-react'
import { FoundationMark } from '@/components/FoundationMark'
import { AppFooter } from '@/components/AppFooter'
import { UserMenu } from '@/components/UserMenu'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/manager', label: 'Home', icon: Home, end: true },
  { to: '/manager/members', label: 'Members', icon: Users },
  { to: '/manager/followups', label: 'Follow-ups', icon: ClipboardList },
  { to: '/manager/donations', label: 'Donations', icon: IndianRupee },
  { to: '/manager/more', label: 'More', icon: MoreHorizontal },
]

export default function ManagerLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b-2 border-gold/40 bg-background/95 px-4 backdrop-blur">
        <FoundationMark size="sm" />
        <UserMenu />
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col pb-24">
        <Outlet />
        <AppFooter />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        aria-label="Primary"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors',
                isActive && 'text-primary',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full transition-colors',
                    isActive && 'bg-gold/20',
                  )}
                >
                  <Icon className="size-5" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
