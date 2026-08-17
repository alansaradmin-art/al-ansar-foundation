import { FoundationMark } from './FoundationMark'

/** Shared across AdminLayout, ManagerLayout, and LoginPage — the year is
 * always computed at render time, never hardcoded. */
export function AppFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-gold/30 px-4 py-4 text-xs text-muted-foreground sm:px-6">
      <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-between sm:text-left">
        <FoundationMark size="xs" />
        <p>
          © {year} Al Ansar Foundation · Developed by Abdul Haseeb
        </p>
      </div>
    </footer>
  )
}
