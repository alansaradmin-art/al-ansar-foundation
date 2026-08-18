import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

type FilterValue = string | number | boolean
type FilterDefaults = Record<string, FilterValue>

function parseValue(raw: string, defaultValue: FilterValue): FilterValue {
  if (typeof defaultValue === 'number') return Number(raw)
  if (typeof defaultValue === 'boolean') return raw === 'true'
  return raw
}

/** Keeps a list page's filters/search/page/tab in the URL (via
 * useSearchParams) instead of local component state, so a browser "back"
 * navigation — e.g. returning from a member's Member 360 page — lands back
 * on the same filtered/paginated view instead of a reset default. Values
 * equal to their default are omitted from the URL to keep it clean.
 *
 * setFilters uses `{ replace: true }` — adjusting a filter never pushes a
 * new history entry, only the Link to a member row does, so that's the one
 * entry Back actually returns to (with this page's URL already reflecting
 * whatever was last set on it). */
export function useUrlFilters<T extends FilterDefaults>(defaults: T): [T, (patch: Partial<T>) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => {
    const result = { ...defaults }
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const raw = searchParams.get(key as string)
      if (raw !== null) result[key] = parseValue(raw, defaults[key]) as T[keyof T]
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  function setFilters(patch: Partial<T>) {
    const next = new URLSearchParams(searchParams)
    for (const key of Object.keys(patch) as (keyof T)[]) {
      const value = patch[key]
      if (value === undefined || value === defaults[key]) {
        next.delete(key as string)
      } else {
        next.set(key as string, String(value))
      }
    }
    setSearchParams(next, { replace: true })
  }

  return [filters, setFilters]
}
