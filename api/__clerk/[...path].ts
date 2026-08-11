// Manual reverse proxy for Clerk's Frontend API, forwarding every request
// under /__clerk/* (the "Clerk proxy URL" configured in Clerk Dashboard →
// Domains for a Production instance that can't get a clerk.<domain> DNS
// record under a shared domain like *.vercel.app).
//
// vercel.json's earlier attempt used a declarative external-URL rewrite,
// which Vercel's edge only proxies as a simple GET passthrough — POSTs like
// /v1/client/sign_ins came back 501 Not Implemented. This function does the
// actual forwarding itself (any method, full body, full headers, cookies),
// which has no such limitation.

export const config = {
  api: { bodyParser: false },
}

// The real Clerk backend host is encoded in the Publishable Key itself —
// confirmed straight from Clerk's own SDK source
// (node_modules/@clerk/shared/dist/runtime/keys-*.js, parsePublishableKey):
// `isomorphicAtob(key.split('_')[2])`, trailing `$` stripped. Proxying only
// changes what the *browser* is told to talk to (via VITE_CLERK_PROXY_URL);
// it never changes what the real upstream is — so this proxy has to decode
// the same key the frontend uses, not guess at a fixed hostname. (An
// earlier version of this file hardcoded frontend-api.clerk.dev, which was
// never verified and is very likely wrong for this instance — this is why
// /npm/@clerk/clerk-js@5/... 404'd.)
function resolveClerkFrontendApi(): string {
  const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY ?? ''
  const encoded = publishableKey.split('_')[2]
  if (!encoded) {
    throw new Error('VITE_CLERK_PUBLISHABLE_KEY is missing or malformed — cannot resolve Clerk Frontend API host.')
  }
  const decoded = Buffer.from(encoded, 'base64').toString('utf8')
  const host = decoded.endsWith('$') ? decoded.slice(0, -1) : decoded
  if (!host.includes('.')) {
    throw new Error(`Decoded an invalid Clerk Frontend API host ("${host}") from VITE_CLERK_PUBLISHABLE_KEY.`)
  }
  return `https://${host}`
}

const CLERK_FRONTEND_API = resolveClerkFrontendApi()

// Headers that must never be forwarded as-is — either they describe this
// hop specifically (host, content-length) and would be wrong for the next
// one, or fetch() recomputes them itself.
const REQUEST_HEADERS_TO_DROP = new Set(['host', 'connection', 'content-length'])
const RESPONSE_HEADERS_TO_DROP = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection'])

interface IncomingRequest extends AsyncIterable<Buffer> {
  method?: string
  headers: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
  socket?: { remoteAddress?: string }
}

interface ServerResponse {
  statusCode: number
  setHeader(name: string, value: string | string[]): void
  end(chunk?: Buffer): void
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function buildUpstreamUrl(req: IncomingRequest): string {
  const pathParam = req.query?.path
  const segments = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : []
  const upstreamPath = `/${segments.join('/')}`

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(req.query ?? {})) {
    if (key === 'path') continue
    if (Array.isArray(value)) value.forEach((v) => search.append(key, v))
    else if (value !== undefined) search.append(key, value)
  }
  const qs = search.toString()
  return `${CLERK_FRONTEND_API}${upstreamPath}${qs ? `?${qs}` : ''}`
}

function buildForwardedHeaders(req: IncomingRequest): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (REQUEST_HEADERS_TO_DROP.has(key.toLowerCase())) continue
    const v = firstValue(value)
    if (v !== undefined) headers.set(key, v)
  }

  const host = firstValue(req.headers['x-forwarded-host']) ?? firstValue(req.headers.host) ?? ''
  const proto = firstValue(req.headers['x-forwarded-proto']) ?? 'https'
  // Tells Clerk which public proxy URL this request is arriving through —
  // required for a Production instance running behind a proxy instead of a
  // direct clerk.<domain> DNS record.
  headers.set('Clerk-Proxy-Url', `${proto}://${host}/__clerk`)
  headers.set('X-Forwarded-Host', host)
  headers.set('X-Forwarded-Proto', proto)

  const clientIp = firstValue(req.headers['x-forwarded-for']) ?? req.socket?.remoteAddress
  if (clientIp) headers.set('X-Forwarded-For', clientIp)

  // Identifies this proxy to Clerk server-side. Never sent to the browser —
  // this file only runs on Vercel, and CLERK_SECRET_KEY is never exposed
  // through a VITE_* variable anywhere in this project.
  const secretKey = process.env.CLERK_SECRET_KEY
  if (secretKey) headers.set('Clerk-Secret-Key', secretKey)

  return headers
}

export default async function handler(req: IncomingRequest, res: ServerResponse) {
  const method = req.method ?? 'GET'
  const upstreamUrl = buildUpstreamUrl(req)
  const headers = buildForwardedHeaders(req)

  let body: Buffer | undefined
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk)
    if (chunks.length > 0) body = Buffer.concat(chunks)
  }

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers,
      // Buffer is a Uint8Array at runtime (valid BodyInit) — Node's fetch
      // typings just don't structurally recognize the Buffer subclass here.
      body: body as BodyInit | undefined,
      redirect: 'manual',
    })
  } catch {
    res.statusCode = 502
    res.end(Buffer.from('Bad Gateway: unable to reach Clerk'))
    return
  }

  res.statusCode = upstreamResponse.status

  const setCookies =
    typeof upstreamResponse.headers.getSetCookie === 'function' ? upstreamResponse.headers.getSetCookie() : []

  upstreamResponse.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (RESPONSE_HEADERS_TO_DROP.has(lower) || lower === 'set-cookie') return
    res.setHeader(key, value)
  })
  if (setCookies.length > 0) res.setHeader('set-cookie', setCookies)

  const responseBody = Buffer.from(await upstreamResponse.arrayBuffer())
  res.end(responseBody)
}
