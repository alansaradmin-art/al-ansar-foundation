// Shared minimal HTTP helpers for every api/*.ts resource file. No default
// export here — Vercel only turns a file into a route when it default-exports
// a handler, so this file (and every other api/_lib/*.ts file) is never
// treated as an endpoint regardless of where it lives.

export interface ApiRequest extends AsyncIterable<Buffer> {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
  body?: unknown
  socket?: { remoteAddress?: string }
}

export interface ApiResponse {
  statusCode: number
  setHeader(name: string, value: string | string[]): void
  end(chunk?: string): void
}

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function readQueryParam(req: ApiRequest, key: string): string | undefined {
  return firstValue(req.query?.[key])
}

export function sendJson(res: ApiResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

export interface ApiErrorBody {
  error: { message: string; code?: string; details?: string }
}

export function sendError(res: ApiResponse, status: number, message: string, code?: string, details?: string): void {
  const body: ApiErrorBody = { error: { message, code, details } }
  sendJson(res, status, body)
}

/** Forwards a Postgres/PostgREST error as a 400 with its code/message/details
 * intact, so the frontend's getFriendlyErrorMessage keeps recognizing
 * 23505/23514 the same way it always has. Anything else is a 500. */
export function sendSupabaseError(res: ApiResponse, error: { code?: string; message?: string; details?: string }): void {
  const status = error.code === '23505' || error.code === '23514' ? 400 : 500
  sendError(res, status, error.message ?? 'Database error.', error.code, error.details ?? undefined)
}

export async function readJsonBody<T>(req: ApiRequest): Promise<T> {
  if (req.body !== undefined) return req.body as T
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf-8')
  return raw ? (JSON.parse(raw) as T) : ({} as T)
}
