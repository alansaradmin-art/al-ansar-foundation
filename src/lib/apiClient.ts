/**
 * Every browser request for protected data goes through this — Supabase's
 * Third-Party Auth integration with Clerk has been removed, so the browser
 * never talks to Supabase directly anymore (see README/DEPLOYMENT.md). This
 * attaches the caller's Clerk session token; the api/*.ts endpoints verify
 * it and resolve role/manager scope server-side (api/_lib/auth.ts).
 */

export type GetToken = () => Promise<string | null>

export class ApiError extends Error {
  status: number
  code?: string
  details?: string

  constructor(status: number, message: string, code?: string, details?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

interface RequestOptions {
  query?: Record<string, string | number | undefined>
  body?: unknown
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  if (!query) return path
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}

async function request<T>(method: string, path: string, getToken: GetToken, options: RequestOptions = {}): Promise<T> {
  const token = await getToken()
  if (!token) {
    throw new ApiError(401, 'Not signed in.')
  }

  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : undefined

  if (!response.ok) {
    const errorBody = data?.error as { message?: string; code?: string; details?: string } | undefined
    throw new ApiError(response.status, errorBody?.message ?? 'Something went wrong.', errorBody?.code, errorBody?.details)
  }

  return data as T
}

export const apiClient = {
  get: <T>(path: string, getToken: GetToken, query?: RequestOptions['query']) =>
    request<T>('GET', path, getToken, { query }),
  post: <T>(path: string, getToken: GetToken, body?: unknown, query?: RequestOptions['query']) =>
    request<T>('POST', path, getToken, { body, query }),
  put: <T>(path: string, getToken: GetToken, body?: unknown, query?: RequestOptions['query']) =>
    request<T>('PUT', path, getToken, { body, query }),
  patch: <T>(path: string, getToken: GetToken, body?: unknown, query?: RequestOptions['query']) =>
    request<T>('PATCH', path, getToken, { body, query }),
}
