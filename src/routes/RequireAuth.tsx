import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useProfile } from '@/contexts/ProfileContext'
import { LoadingState, ErrorState } from '@/components/StateViews'
import { getFriendlyErrorMessage } from '@/lib/errors'
import WaitingForSetupPage from '@/pages/WaitingForSetupPage'

export default function RequireAuth() {
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth()
  const { profile, isLoading, isUnprovisioned, isError, error } = useProfile()

  if (!isClerkLoaded) {
    return <LoadingState label="Loading…" />
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return <LoadingState label="Loading your account…" />
  }

  if (isError) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <ErrorState
          message={getFriendlyErrorMessage(
            error,
            'Unable to load your account. Check that the database is set up correctly and try again.',
          )}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  if (isUnprovisioned || !profile) {
    return <WaitingForSetupPage />
  }

  return <Outlet />
}
