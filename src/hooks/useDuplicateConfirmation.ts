import { useState } from 'react'
import { ApiError } from '@/lib/apiClient'

/** Recognizes the POSSIBLE_DUPLICATE contract (api/donations.ts's create
 * and update handlers, api/followups.ts's create handler) and holds the
 * pending confirmation state for it — shared by every create/edit dialog
 * that can hit a soft duplicate check, so each one only needs a few lines
 * instead of re-deriving this. Not a generic mutation wrapper — this app
 * keeps each dialog's own mutate() call explicit; this hook only owns the
 * one narrow concern of "was that error actually a duplicate warning". */
export function useDuplicateConfirmation<TValues, TExisting = unknown>() {
  const [duplicate, setDuplicate] = useState<{ values: TValues; existing: TExisting } | null>(null)

  /** Call from a mutation's onError. Returns true if the error was a
   * possible-duplicate (and the confirm dialog is now open) — the caller
   * should skip its normal error toast in that case. */
  function checkError(error: unknown, values: TValues): boolean {
    if (error instanceof ApiError && error.code === 'POSSIBLE_DUPLICATE') {
      const existing = (error.data as { existing?: TExisting } | undefined)?.existing
      setDuplicate({ values, existing: existing as TExisting })
      return true
    }
    return false
  }

  function clear() {
    setDuplicate(null)
  }

  return { duplicate, checkError, clear }
}
