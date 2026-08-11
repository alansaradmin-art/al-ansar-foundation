import { Webhook } from 'svix'
import { createClient } from '@supabase/supabase-js'

// Raw body access is required for svix signature verification.
export const config = {
  api: { bodyParser: false },
}

interface IncomingRequest extends AsyncIterable<Buffer> {
  method?: string
  headers: Record<string, string | string[] | undefined>
}

interface ServerResponse {
  statusCode: number
  end(chunk?: string): void
}

interface ClerkEmailAddress {
  id: string
  email_address: string
}

interface ClerkUserEvent {
  type: string
  data: {
    id: string
    first_name: string | null
    last_name: string | null
    primary_email_address_id: string | null
    email_addresses: ClerkEmailAddress[]
  }
}

function headerValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : (value ?? '')
}

export default async function handler(req: IncomingRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end('Method not allowed')
    return
  }

  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const adminEmail = (process.env.FOUNDATION_ADMIN_EMAIL ?? '').toLowerCase()

  if (!signingSecret || !supabaseUrl || !serviceRoleKey) {
    res.statusCode = 500
    res.end('Server misconfigured')
    return
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  const rawBody = Buffer.concat(chunks).toString('utf-8')

  let event: ClerkUserEvent
  try {
    const wh = new Webhook(signingSecret)
    event = wh.verify(rawBody, {
      'svix-id': headerValue(req.headers['svix-id']),
      'svix-timestamp': headerValue(req.headers['svix-timestamp']),
      'svix-signature': headerValue(req.headers['svix-signature']),
    }) as ClerkUserEvent
  } catch {
    res.statusCode = 400
    res.end('Invalid signature')
    return
  }

  if (event.type !== 'user.created' && event.type !== 'user.updated') {
    res.statusCode = 200
    res.end('ignored')
    return
  }

  const { id: clerkUserId, first_name, last_name, primary_email_address_id, email_addresses } = event.data
  const email = email_addresses.find((e) => e.id === primary_email_address_id)?.email_address
  const fullName = [first_name, last_name].filter(Boolean).join(' ').trim()

  if (!email) {
    res.statusCode = 200
    res.end('no primary email')
    return
  }

  const normalizedEmail = email.toLowerCase()
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  if (normalizedEmail === adminEmail) {
    await supabase.from('profiles').upsert(
      {
        clerk_user_id: clerkUserId,
        email: normalizedEmail,
        full_name: fullName || 'Al Ansar Foundation Admin',
        role: 'ADMIN',
        manager_id: null,
        is_active: true,
      },
      { onConflict: 'clerk_user_id' },
    )
    res.statusCode = 200
    res.end('admin provisioned')
    return
  }

  const { data: manager } = await supabase
    .from('managers')
    .select('id, full_name, status')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (manager) {
    await supabase.from('profiles').upsert(
      {
        clerk_user_id: clerkUserId,
        email: normalizedEmail,
        full_name: fullName || manager.full_name,
        role: 'MANAGER',
        manager_id: manager.id,
        is_active: manager.status === 'ACTIVE',
      },
      { onConflict: 'clerk_user_id' },
    )
    res.statusCode = 200
    res.end('manager provisioned')
    return
  }

  // No matching manager email — leave unprovisioned. The app shows a
  // "waiting for setup" screen; once Admin corrects managers.email, the
  // next Clerk event for this user (e.g. a profile edit) reconciles it.
  res.statusCode = 200
  res.end('unmatched, left unprovisioned')
}
