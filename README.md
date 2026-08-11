# Al Ansar Foundation — Member & Donation Management

Mobile-first NGO member and voluntary donation management system. React + Vite + TypeScript
+ Tailwind + shadcn/ui, Clerk for authentication (fully custom UI, no prebuilt Clerk
components), Supabase Postgres for data with Row-Level Security as the authorization
boundary.

**Setting up Supabase, Clerk, or Vercel for the first time — or need to rotate a key,
change the Foundation Admin email, or migrate to a new Supabase/Clerk project?** See
**[DEPLOYMENT.md](./DEPLOYMENT.md)** — full end-to-end instructions live there so this file
doesn't get out of sync with it.

## Quick start (once Supabase and Clerk are already set up)

```
npm install
cp .env.example .env.local   # fill in the three VITE_ variables — see DEPLOYMENT.md §5
npm run dev
```

## Project structure

```
src/
  components/       shared UI (StateViews, PeriodSelector, UserMenu, StatusBadge) + components/ui (shadcn primitives)
  layouts/          ManagerLayout (bottom nav), AdminLayout (sidebar/drawer)
  pages/            route-level screens, split into admin/ and manager/, plus LoginPage/SsoCallbackPage
  features/         feature UI grouped by domain (members, donations, followups, managers, dashboard, reports)
  hooks/            TanStack Query hooks, one per service
  services/         typed Supabase data-access, one file per table — the only place that calls supabase-js directly
  schemas/          Zod schemas shared by forms and CSV import validation
  types/            hand-authored Database type (see comment in database.ts for how to regenerate) + app types
  contexts/         SupabaseContext (Clerk-bound client), ProfileContext (role resolution)
  routes/           route guards (UX convenience — RLS is the real authorization boundary) + the route table
  lib/              formatINR, tel/whatsapp link builders, CSV parse/build, friendly error mapping

api/
  webhooks/clerk.ts  the only serverless function — provisions a profiles row when someone signs in (production only; see DEPLOYMENT.md §1)

supabase/
  migrations/        numbered SQL migrations (schema, functions, RLS, seed, self-provisioning, dashboard aggregates)
  seed.sql            dev/test-only sample data (never applied to production)
```

## Why only one serverless function

Reads and writes go straight from the browser to Supabase via `supabase-js`, authorized
entirely by Postgres RLS reading the Clerk session JWT (see
`supabase/migrations/0003_rls.sql`). New `profiles` rows are created by the app itself
calling a Postgres function (`provision_my_profile`, see `0007_self_provisioning.sql`) —
this works even in local development. The Clerk webhook duplicates that same matching
server-side for production, but nothing in the app depends on it being configured. CSV
member import is also a plain RLS-authorized client call (a multi-row `INSERT` is already
atomic in Postgres), so no separate transactional endpoint was needed for it either.

## Custom authentication

`src/pages/LoginPage.tsx` is a fully custom sign-in flow built on Clerk's headless
`useSignIn` hook — not Clerk's prebuilt `<SignIn/>` component. It adapts to whatever sign-in
methods are enabled in your Clerk instance (Google OAuth, password, or email code) rather
than assuming one. `src/components/UserMenu.tsx` and `LogoutDialog.tsx` similarly replace
Clerk's prebuilt `<UserButton/>` with app-styled equivalents. Role-based redirection
(`/admin` vs `/manager`) is driven entirely by `profiles.role` in Supabase — Clerk never
decides authorization, only identity.

## Known limitation

CSV import only — the `xlsx` npm package currently ships with unpatched high-severity
advisories (prototype pollution, ReDoS) with no fix available, so it was deliberately left
out. Ask Admin to export Excel sheets to CSV before importing.
