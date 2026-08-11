import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/queryClient'
import { SupabaseProvider } from '@/contexts/SupabaseContext'
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

if (!clerkPublishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill it in.')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/login">
      <QueryClientProvider client={queryClient}>
        <SupabaseProvider>
          <ProfileProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
            <Toaster position="top-center" richColors />
          </ProfileProvider>
        </SupabaseProvider>
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>,
)
