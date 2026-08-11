import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth, useSignIn } from '@clerk/clerk-react'
import { ArrowLeft, Loader2, TriangleAlert } from 'lucide-react'
import { FoundationMark } from '@/components/FoundationMark'
import { LoadingState } from '@/components/StateViews'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getClerkErrorMessage } from '@/lib/errors'

type Step = 'identify' | 'password' | 'code'

/** A type guard, not a cast — narrows the union returned by
 * supportedFirstFactors down to the branch that actually carries
 * emailAddressId, so accessing it below type-checks honestly. */
function hasEmailAddressId(factor: unknown): factor is { emailAddressId: string } {
  return !!factor && typeof factor === 'object' && 'emailAddressId' in factor
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.5 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.1 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-3.9 6.8-9.7 6.8-17.4z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.3c-.5-1.5-.8-3.1-.8-4.8s.3-3.3.8-4.8l-7.9-6.1C1 15.9 0 19.8 0 23.5s1 7.6 2.6 10.9l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 47c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2.1 1.4-4.9 2.3-8.6 2.3-6.3 0-11.6-3.6-13.5-8.7l-7.9 6.1C6.5 41.6 14.6 47 24 47z"
      />
    </svg>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  )
}

export default function LoginPage() {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth()
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('identify')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Already signed in — "/" hands off to RoleHome, which sends them to
  // whichever dashboard their Supabase profile role resolves to.
  if (isAuthLoaded && isSignedIn) {
    return <Navigate to="/" replace />
  }

  if (!isAuthLoaded || !isSignInLoaded) {
    return <LoadingState label="Loading…" />
  }

  async function completeIfSessionReady(status: string | null | undefined, createdSessionId: string | null | undefined) {
    if (status === 'complete' && createdSessionId && setActive) {
      await setActive({ session: createdSessionId })
      navigate('/', { replace: true })
      return true
    }
    return false
  }

  async function handleGoogleSignIn() {
    setError(null)
    setIsGoogleLoading(true)
    try {
      await signIn!.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      })
    } catch (err) {
      setError(getClerkErrorMessage(err, 'Unable to sign in with Google. Please try again.'))
      setIsGoogleLoading(false)
    }
  }

  async function handleIdentify(e: FormEvent) {
    e.preventDefault()
    if (!signIn) return
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await signIn.create({ identifier: email.trim() })
      if (await completeIfSessionReady(result.status, result.createdSessionId)) return

      const factors = result.supportedFirstFactors ?? []
      const passwordFactor = factors.find((f) => f.strategy === 'password')
      const emailCodeFactor = factors.find((f) => f.strategy === 'email_code')

      if (passwordFactor) {
        setStep('password')
      } else if (emailCodeFactor && hasEmailAddressId(emailCodeFactor)) {
        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: emailCodeFactor.emailAddressId,
        })
        setStep('code')
      } else {
        setError('This account can only sign in with Google. Use "Continue with Google" above.')
      }
    } catch (err) {
      setError(
        getClerkErrorMessage(err, 'Unable to sign in. Please check your email and try again.'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    if (!signIn) return
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await signIn.attemptFirstFactor({ strategy: 'password', password })
      const done = await completeIfSessionReady(result.status, result.createdSessionId)
      if (!done) {
        setError('Additional verification is required for this account. Please contact the Foundation Admin.')
      }
    } catch (err) {
      setError(getClerkErrorMessage(err, 'Unable to sign in. Please check your credentials and try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault()
    if (!signIn) return
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code })
      const done = await completeIfSessionReady(result.status, result.createdSessionId)
      if (!done) {
        setError('Additional verification is required for this account. Please contact the Foundation Admin.')
      }
    } catch (err) {
      setError(getClerkErrorMessage(err, 'That verification code is incorrect. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  function backToIdentify() {
    setStep('identify')
    setError(null)
    setPassword('')
    setCode('')
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/30 px-4 py-10 sm:px-6">
      <FoundationMark subtitle="Member & Donation Management System" />

      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-1 text-center">
          <h1 className="font-display text-xl font-semibold">
            {step === 'identify' ? 'Assalamu alaikum' : 'Welcome back'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === 'identify' && 'Sign in to continue to the Al Ansar Foundation System.'}
            {step === 'password' && `Enter the password for ${email}.`}
            {step === 'code' && `Enter the verification code sent to ${email}.`}
          </p>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {step === 'identify' && (
          <div className="space-y-5">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={isGoogleLoading}
              onClick={handleGoogleSignIn}
            >
              {isGoogleLoading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleIdentify}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !email.trim()}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Continue
              </Button>
            </form>
          </div>
        )}

        {step === 'password' && (
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !password}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Sign in
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={backToIdentify} disabled={isSubmitting}>
              <ArrowLeft className="size-4" /> Use a different email
            </Button>
          </form>
        )}

        {step === 'code' && (
          <form className="space-y-4" onSubmit={handleCodeSubmit}>
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-11 text-center text-lg tracking-widest"
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !code}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Verify &amp; sign in
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={backToIdentify} disabled={isSubmitting}>
              <ArrowLeft className="size-4" /> Use a different email
            </Button>
          </form>
        )}
      </div>

      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Access is limited to Al Ansar Foundation admins and managers. Contact the Foundation Admin if you need an
        account.
      </p>
    </div>
  )
}
