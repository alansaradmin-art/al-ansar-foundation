import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
import { LoadingState } from '@/components/StateViews'

/**
 * Completes the Google OAuth redirect started by LoginPage's "Continue with
 * Google" button. This has no visual design of its own to violate the
 * "no default Clerk UI" requirement — it's the token-exchange handoff
 * Clerk's redirect-based OAuth flow requires, not a login screen.
 */
export default function SsoCallbackPage() {
  return (
    <>
      <LoadingState label="Signing you in…" />
      <AuthenticateWithRedirectCallback signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/" />
    </>
  )
}
