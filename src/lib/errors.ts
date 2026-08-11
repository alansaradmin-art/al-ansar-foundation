interface ErrorLike {
  code?: string
  message?: string
  details?: string | null
}

/**
 * Maps known Postgres/PostgREST error shapes to the user-facing copy
 * specified for this app. Raw database errors must never reach a toast.
 */
export function getFriendlyErrorMessage(error: unknown, fallback: string): string {
  const err = error as ErrorLike | undefined
  const code = err?.code
  const text = `${err?.message ?? ''} ${err?.details ?? ''}`.toLowerCase()

  if (code === '23505') {
    if (text.includes('member_id')) return 'Member ID already exists.'
    if (text.includes('managers_email')) return 'A manager with this email already exists.'
    if (text.includes('donation_id')) return 'Donation ID already exists.'
    return 'This record already exists.'
  }

  if (code === '23514') {
    if (text.includes('transaction_ref_required_for_non_cash')) {
      return 'Transaction reference is required for UPI, Online, or Bank Transfer payments.'
    }
    if (text.includes('amount_inr')) return 'Donation amount must be greater than ₹0.'
    return 'One of the values entered is not valid.'
  }

  if (code === '42501' || text.includes('row-level security')) {
    return 'You do not have permission to access this record.'
  }

  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST202') {
    return 'The database is not set up yet — run the SQL migrations in supabase/migrations against this Supabase project, then try again.'
  }

  if (text.includes('not authenticated')) {
    return 'Supabase could not read your Clerk session (auth.jwt() is empty). Check Supabase → Authentication → Sign In / Providers → Third Party Auth is connected to Clerk, and that VITE_SUPABASE_URL/ANON_KEY match this project.'
  }

  return fallback
}

interface ClerkErrorLike {
  errors?: { code?: string; message?: string; longMessage?: string }[]
}

const CLERK_ERROR_CODES: Record<string, string> = {
  form_identifier_not_found: "We couldn't find an account with that email. Please contact the Foundation Admin.",
  form_password_incorrect: 'Incorrect password. Please try again.',
  form_code_incorrect: 'That verification code is incorrect. Please try again.',
  form_param_format_invalid: 'Enter a valid email address.',
  session_exists: 'You are already signed in.',
  too_many_requests: 'Too many attempts. Please wait a moment and try again.',
  network_error: 'Unable to reach the sign-in service. Check your connection and try again.',
}

/**
 * Maps Clerk's { errors: [{ code, message, longMessage }] } error shape to
 * the user-facing copy for this app. Raw Clerk error text never reaches the
 * login form directly.
 */
export function getClerkErrorMessage(error: unknown, fallback: string): string {
  const first = (error as ClerkErrorLike | undefined)?.errors?.[0]
  if (!first) return fallback
  if (first.code && CLERK_ERROR_CODES[first.code]) return CLERK_ERROR_CODES[first.code]
  return first.longMessage || first.message || fallback
}
