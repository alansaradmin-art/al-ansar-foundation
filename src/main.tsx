import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/queryClient'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import App from './App.tsx'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/lexend/600.css'
import '@fontsource/lexend/700.css'
import './index.css'

// A tab left open across a deploy still has the OLD index.html's hashed
// chunk filenames (e.g. AdminLayout-<hash>.js) baked into its loaded page.
// Once that deploy is gone, fetching one of those old chunks can never
// succeed — Vite fires this exact event when a dynamically-imported chunk
// (every lazy-loaded route in this app, see AppRoutes.tsx) fails to load,
// which is otherwise an unrecoverable white-screen crash for anyone who
// had the app open when a new version shipped. Reload once (a page load
// always fetches the current index.html, which points at the current
// deploy's real chunks) rather than looping forever if something else is
// genuinely wrong — sessionStorage is per-tab, so a different tab or a
// later real deploy both get their own fresh attempt.
const PRELOAD_ERROR_RELOAD_KEY = 'vite-preload-error-reloaded'
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem(PRELOAD_ERROR_RELOAD_KEY)) return
  sessionStorage.setItem(PRELOAD_ERROR_RELOAD_KEY, '1')
  window.location.reload()
})

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
// Only set in Vercel's production env — Clerk's Production instance can't
// get a clerk.<domain> DNS record under a shared *.vercel.app domain, so it
// runs through a reverse proxy at /__clerk instead (see vercel.json). Local
// dev and any deploy using a Development-instance key leave this unset and
// talk to Clerk's *.clerk.accounts.dev domain directly — no proxy involved.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL || undefined

if (!clerkPublishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill it in.')
}

// Got this far without a preload error on THIS load — release the guard so
// a later, genuinely new failure (a long-lived tab open across the *next*
// deploy too) still gets its own reload rather than being silently skipped
// because of a flag left over from an much earlier one in the same tab.
sessionStorage.removeItem(PRELOAD_ERROR_RELOAD_KEY)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey} proxyUrl={clerkProxyUrl} afterSignOutUrl="/login">
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ProfileProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
            <Toaster position="top-center" richColors />
          </ProfileProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ClerkProvider>
  </StrictMode>,
)
