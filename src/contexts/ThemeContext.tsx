import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useUser } from '@clerk/clerk-react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'al-ansar-theme'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser()

  // The inline bootstrap script in index.html already applied the right
  // class before this component ever mounts — read it back instead of
  // re-deriving from localStorage, so there's no chance of disagreeing
  // with what's already on screen.
  const [theme, setThemeState] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )

  // Once Clerk resolves the signed-in user, reconcile with their stored
  // preference — this is what makes a new device/browser pick up the
  // preference on next login, not just this browser's localStorage.
  useEffect(() => {
    if (!isLoaded || !user) return
    const stored = user.unsafeMetadata?.theme
    if ((stored === 'light' || stored === 'dark') && stored !== theme) {
      setThemeState(stored)
      applyTheme(stored)
      localStorage.setItem(STORAGE_KEY, stored)
    }
    // Only ever re-run when the signed-in user changes, not on every local
    // theme change — otherwise this would immediately overwrite a fresh
    // setTheme() call with the (now stale) value already in Clerk.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id])

  function setTheme(next: Theme) {
    setThemeState(next)
    applyTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
    if (user) {
      user.update({ unsafeMetadata: { ...user.unsafeMetadata, theme: next } }).catch(() => {
        // Non-fatal: the UI already switched and localStorage already has
        // it for this browser — only cross-device sync is affected.
      })
    }
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
