// Manual reverse proxy for Clerk's Frontend API, forwarding every request
// under /__clerk/* (the "Clerk proxy URL" configured in Clerk Dashboard →
// Domains for a Production instance that can't get a clerk.<domain> DNS
// record under a shared domain like *.vercel.app). Clerk's own SDK
// deliberately routes BOTH the clerk.browser.js script load AND every
// /v1/* API call through this same proxy path — confirmed from
// node_modules/@clerk/shared/dist/runtime/loadClerkJsScript-*.js — so this
// one function has to correctly handle both.
//
// vercel.json rewrites the public /__clerk/:path* to this function
// internally (NOT to an external URL — Vercel's declarative rewrites only
// proxy external destinations as a GET-only passthrough, which is why an
// earlier version of this setup 501'd on POST /v1/client/sign_ins).

export const config = {
  api: { bodyParser: false },
}

// Where this proxy forwards to is genuinely hard to determine from outside
// Clerk's dashboard for a Production instance running in proxy mode (no
// custom domain owned). Two sources, in priority order:
//
// 1. CLERK_PROXY_UPSTREAM — set this explicitly if you have the exact value
//    from Clerk Dashboard → Domains → "Copy setup instructions". This is
//    the reliable source of truth and always wins if set.
// 2. Decoded from VITE_CLERK_PUBLISHABLE_KEY (isomorphicAtob(key.split('_')[2]),
//    trailing '$' stripped — same algorithm Clerk's own SDK uses in
//    node_modules/@clerk/shared/dist/runtime/keys-*.js). This is Clerk's
//    documented mechanism for finding the Frontend API host in *direct*
//    (non-proxy) mode, and may or may not equal the real proxy-mode
//    upstream — verify with GET /__clerk-debug (see below) before trusting it.
function resolveClerkFrontendApi(): string {
  const override = process.env.CLERK_PROXY_UPSTREAM
  if (override) return override.replace(/\/+$/, '')

  const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY ?? ''
  const encoded = publishableKey.split('_')[2]
  if (!encoded) {
    throw new Error('VITE_CLERK_PUBLISHABLE_KEY is missing or malformed — cannot resolve a Clerk upstream.')
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
  url?: string
  headers: Record<string, string | string[] | undefined>
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

// Parsed straight from req.url rather than Vercel's rewrite-injected query
// params — this only assumes req.url is whatever this function was actually
// invoked with, which holds regardless of how the /__clerk → /api/__clerk
// rewrite passes parameters through, removing one whole axis of "is the
// dynamic route wired up the way I assumed" uncertainty.
function upstreamPathAndQuery(req: IncomingRequest): string {
  const raw = req.url ?? '/'
  const withoutPrefix = raw.replace(/^\/api\/__clerk/, '').replace(/^\/__clerk/, '')
  return withoutPrefix || '/'
}

function buildForwardedHeaders(req: IncomingRequest, proxyPublicUrl: string): Headers {
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
  // direct clerk.<domain> DNS record. Best-effort header name/value — not
  // independently verifiable from published SDK source (see DEPLOYMENT.md).
  headers.set('Clerk-Proxy-Url', proxyPublicUrl)
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
  const host = firstValue(req.headers['x-forwarded-host']) ?? firstValue(req.headers.host) ?? ''
  const proto = firstValue(req.headers['x-forwarded-proto']) ?? 'https'
  const proxyPublicUrl = `${proto}://${host}/__clerk`
  const pathAndQuery = upstreamPathAndQuery(req)

  // Safe, no-secret self-check: GET /__clerk/__debug shows exactly what
  // this function resolved, without needing a real Clerk request to fail
  // first. Visit https://<your-domain>/__clerk/__debug directly.
  if (pathAndQuery.startsWith('/__debug')) {
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end(
      Buffer.from(
        JSON.stringify(
          {
            resolvedUpstream: CLERK_FRONTEND_API,
            upstreamSource: process.env.CLERK_PROXY_UPSTREAM ? 'CLERK_PROXY_UPSTREAM override' : 'decoded from VITE_CLERK_PUBLISHABLE_KEY',
            proxyPublicUrl,
            requestUrl: req.url,
          },
          null,
          2,
        ),
      ),
    )
    return
  }

  const method = req.method ?? 'GET'
  const upstreamUrl = `${CLERK_FRONTEND_API}${pathAndQuery}`
  const headers = buildForwardedHeaders(req, proxyPublicUrl)

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
  } catch (err) {
    res.statusCode = 502
    res.setHeader('content-type', 'text/plain')
    const message = err instanceof Error ? err.message : String(err)
    res.end(Buffer.from(`Bad Gateway: proxy could not reach ${upstreamUrl}\n${message}`))
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
