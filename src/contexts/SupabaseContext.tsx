import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { createSupabaseClient, type AppSupabaseClient } from '@/lib/supabase'

const SupabaseContext = createContext<AppSupabaseClient | null>(null)

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth()

  const client = useMemo(
    () => createSupabaseClient(() => getToken()),
    [getToken],
  )

  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>
}

export function useSupabaseClient(): AppSupabaseClient {
  const client = useContext(SupabaseContext)
  if (!client) {
    throw new Error('useSupabaseClient must be used within a SupabaseProvider')
  }
  return client
}
