import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/queryClient'
import { ProfileProvider } from '@/contexts/ProfileContext'
import App from './App.tsx'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/lexend/600.css'
import '@fontsource/lexend/700.css'
import './index.css'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey} proxyUrl={clerkProxyUrl} afterSignOutUrl="/login">
      <QueryClientProvider client={queryClient}>
        <ProfileProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
          <Toaster position="top-center" richColors />
        </ProfileProvider>
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>,
)
