# Al Ansar Foundation — Member & Donation Management

Mobile-first NGO member and voluntary donation management system. React + Vite + TypeScript
+ Tailwind + shadcn/ui, Clerk for authentication (fully custom UI, no prebuilt Clerk
components), a server-side API layer (`api/*.ts`, Vercel Functions) that verifies each
request's Clerk session and enforces role/manager-scoped authorization in TypeScript, and
Supabase Postgres for data (accessed only from that API layer, via the service-role key —
the browser never talks to Supabase directly).

**Setting up Supabase, Clerk, or Vercel for the first time — or need to rotate a key,
change the Foundation Admin email, or migrate to a new Supabase/Clerk project?** See
**[DEPLOYMENT.md](./DEPLOYMENT.md)** — full end-to-end instructions live there so this file
doesn't get out of sync with it.

## Quick start (once Supabase and Clerk are already set up)

```
npm install
cp .env.example .env.local   # fill in the variables — see DEPLOYMENT.md §5
npm run dev:api              # runs `vercel dev` — serves the app AND api/*.ts together
```

(Plain `npm run dev` runs `vite` alone — no sign-in, no data, frontend-only. See
DEPLOYMENT.md §6 for why these are two separate scripts.)

## Project structure

```
src/
  components/       shared UI (StateViews, PeriodSelector, UserMenu, StatusBadge) + components/ui (shadcn primitives)
  layouts/          ManagerLayout (bottom nav), AdminLayout (sidebar/drawer)
  pages/            route-level screens, split into admin/ and manager/, plus LoginPage/SsoCallbackPage
  features/         feature UI grouped by domain (members, donations, followups, managers, dashboard, reports)
  hooks/            TanStack Query hooks, one per service
  services/         typed API-layer data-access, one file per resource — calls src/lib/apiClient.ts, never Supabase directly
  schemas/          Zod schemas shared by forms and CSV import validation
  types/            hand-authored Database type (see comment in database.ts for how to regenerate) + app types
  contexts/         ProfileContext (role resolution, backed by GET /api/profile)
  routes/           route guards (UX convenience — the api/*.ts layer is the real authorization boundary) + the route table
  lib/              apiClient (Clerk-bearer-token fetch wrapper), formatINR, tel/whatsapp link builders, CSV parse/build, friendly error mapping

api/
  _lib/              shared server helpers: auth.ts (verifies Clerk tokens, resolves/self-provisions profiles, role/scope guards), auditLog.ts, http.ts — no default export, never routable
  members.ts, donations.ts, followups.ts, managers.ts, dashboard.ts, settings.ts, audit-logs.ts, profile.ts
                     the data-access layer — each a plain statically-named Vercel Function dispatching on method + query params, service-role Supabase client, TypeScript-enforced authorization
  webhooks/clerk.ts  provisions a profiles row when Clerk fires user.created/updated (production nicety; api/profile.ts self-provisions regardless — see DEPLOYMENT.md §1)
  clerk-proxy.ts     reverse proxy for Clerk's own Frontend API traffic (unrelated to data access — see DEPLOYMENT.md §9.3)

supabase/
  migrations/        numbered SQL migrations (schema, functions, RLS, seed, self-provisioning, dashboard aggregates, API-layer cutover)
  seed.sql            dev/test-only sample data (never applied to production)
```

## Why the server-side API layer

The browser never talks to Supabase — reads and writes go through `api/*.ts`, which
verifies the caller's Clerk session token itself (`@clerk/backend`), resolves their
`profiles.role`/`manager_id` using the Supabase **service-role key**, and enforces who can
see or write what in TypeScript (`api/_lib/auth.ts`). This project used to authorize
everything with Postgres Row-Level Security reading the Clerk JWT directly (Supabase
"Third-Party Auth"); that's been removed in favor of this API layer — RLS stays enabled as
defense-in-depth, but the service role bypasses it by design, so it's no longer what actually
protects anything. New `profiles` rows are still created the moment someone with no profile
yet calls `GET /api/profile` (self-provisioning, works everywhere including localhost); the
Clerk webhook duplicates that same matching slightly ahead of time in production, but nothing
depends on it being configured.

## Custom authentication

`src/pages/LoginPage.tsx` is a fully custom sign-in flow built on Clerk's headless
`useSignIn` hook — not Clerk's prebuilt `<SignIn/>` component. It adapts to whatever sign-in
methods are enabled in your Clerk instance (Google OAuth, password, or email code) rather
than assuming one. `src/components/UserMenu.tsx` and `LogoutDialog.tsx` similarly replace
Clerk's prebuilt `<UserButton/>` with app-styled equivalents. Role-based redirection
(`/admin` vs `/manager`) is driven entirely by `profiles.role`, resolved server-side by
`api/profile.ts` — Clerk never decides authorization, only identity.

## Known limitation

CSV import only — the `xlsx` npm package currently ships with unpatched high-severity
advisories (prototype pollution, ReDoS) with no fix available, so it was deliberately left
out. Ask Admin to export Excel sheets to CSV before importing.
