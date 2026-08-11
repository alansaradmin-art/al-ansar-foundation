// Manual reverse proxy for Clerk's Frontend API, forwarding every request
// under /__clerk/* (the "Clerk proxy URL" configured in Clerk Dashboard →
// Domains for a Production instance that can't get a clerk.<domain> DNS
// record under a shared domain like *.vercel.app). Clerk's own SDK
// deliberately routes BOTH the clerk.browser.js script load AND every
// /v1/* API call through this same proxy path — confirmed from
// node_modules/@clerk/shared/dist/runtime/loadClerkJsScript-*.js — so this
// one function has to correctly handle both.
//
// This is a plain, statically-named function (NOT api/__clerk/[...path].ts,
// Vercel's Next.js-style dynamic catch-all convention) — that convention
// stopped working on this project (every /__clerk/* request 404'd at
// Vercel's platform level, before ever reaching this code, even once a
// deployment was confirmed to include it: removing vercel.json's SPA
// catch-all broke /login as expected, proving the deploy was live, while
// /__clerk/__debug kept 404ing in that same deploy). vercel.json instead
// captures the wildcard segment as a query-string parameter, Vercel's
// oldest and most universally-documented rewrite mechanism, independent of
// any framework-specific file-routing convention:
//   { "source": "/__clerk/:path*", "destination": "/api/clerk-proxy?path=:path*" }

// The real Clerk backend host is encoded in the Publishable Key itself, or
// can be overridden explicitly. See CLERK_PROXY_UPSTREAM below.
//
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
//    upstream — verify with GET /__clerk/__debug (see below) before trusting it.
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

// The wildcard segment Vercel captured from /__clerk/:path* arrives as the
// `path` query param (per vercel.json's destination, `?path=:path*`) — a
// single string with any internal slashes already joined, e.g. for
// /__clerk/npm/@clerk/clerk-js@5/dist/clerk.browser.js it's
// "npm/@clerk/clerk-js@5/dist/clerk.browser.js". Any *other* query params on
// the original request (real Clerk API calls do carry their own, e.g.
// _clerk_js_version) are forwarded too — everything except `path` itself.
function buildUpstreamUrl(req: IncomingRequest): string {
  const pathParam = firstValue(req.query?.path) ?? ''
  const upstreamPath = `/${pathParam}`

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(req.query ?? {})) {
    if (key === 'path') continue
    if (Array.isArray(value)) value.forEach((v) => search.append(key, v))
    else if (value !== undefined) search.append(key, value)
  }
  const qs = search.toString()
  return `${CLERK_FRONTEND_API}${upstreamPath}${qs ? `?${qs}` : ''}`
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
  const pathParam = firstValue(req.query?.path) ?? ''

  // Safe, no-secret self-check: GET /__clerk/__debug shows exactly what
  // this function resolved, without needing a real Clerk request to fail
  // first. Visit https://<your-domain>/__clerk/__debug directly.
  if (pathParam === '__debug') {
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
            resolvedPathParam: pathParam,
          },
          null,
          2,
        ),
      ),
    )
    return
  }

  const method = req.method ?? 'GET'
  const upstreamUrl = buildUpstreamUrl(req)
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
