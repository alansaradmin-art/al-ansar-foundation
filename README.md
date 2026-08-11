# Al Ansar Foundation — Member & Donation Management

Mobile-first NGO member and voluntary donation management system. React + Vite + TypeScript + Tailwind + shadcn/ui, Clerk for auth, Supabase Postgres for data with Row-Level Security as the authorization boundary.

See the design doc (architecture, ERD, RLS strategy, pending-follow-up rule) shared separately for the full rationale behind these choices.

## 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → Data API**, note the Project URL and `anon` public key.
3. In **Project Settings → API → Service Role**, note the `service_role` key (server-only, never exposed to the browser).
4. Run the migrations in order against your project (SQL Editor, or `supabase db push` if using the CLI):
   ```
   supabase/migrations/0001_schema.sql
   supabase/migrations/0002_functions.sql
   supabase/migrations/0003_rls.sql
   supabase/migrations/0004_seed.sql
   supabase/migrations/0005_donation_id_sequence.sql
   supabase/migrations/0006_dashboard_functions.sql
   ```
   `0004_seed.sql` seeds `app_settings` and the 11 managers. **Note:** the source list gave both "Anwarul Haque" and "Mohammad Anwar" the same email (`anwar@gmail.com`); Mohammad Anwar was seeded with a placeholder (`anwar.m@gmail.com`) — correct it in Admin → Managers with his real email before inviting him.
5. Optional, local/dev only: `supabase/seed.sql` adds sample members/donations/follow-ups for testing. Never run this against production.
6. In **Authentication → Sign In / Providers → Third Party Auth**, add Clerk as a provider (Supabase's native Clerk integration) so Postgres RLS can read the Clerk session JWT directly — no manual JWT template needed.

## 2. Create the Clerk application

1. Create an application at [clerk.com](https://clerk.com).
2. Enable email sign-in (magic link or OTP — no password needed for this use case).
3. Under **Configure → Third-Party Auth / Integrations**, connect Supabase (this is the other half of the step above).
4. Under **Webhooks**, add an endpoint pointing at `https://<your-vercel-domain>/api/webhooks/clerk`, subscribed to `user.created` and `user.updated`. Copy the signing secret into `CLERK_WEBHOOK_SIGNING_SECRET`.
5. Invite the Foundation Admin (`alansar.admin@gmail.com`) and each manager by their real email from the Clerk dashboard. When they accept and sign in, the webhook links their Clerk account to the matching `profiles` row automatically.

## 3. Configure environment variables

Copy `.env.example` to `.env.local` for local development:

```
VITE_CLERK_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Server-only variables (set these in Vercel's Project Settings → Environment Variables, never in a `VITE_` var):

```
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
FOUNDATION_ADMIN_EMAIL=alansar.admin@gmail.com
```

## 4. Run locally

```
npm install
npm run dev
```

## 5. Deploy

Push to a Git repository and import it into Vercel. Vercel auto-detects the Vite frontend and the `api/webhooks/clerk.ts` serverless function. Set the environment variables above in the Vercel project, then point the Clerk webhook at the deployed URL.

## Project structure

```
src/
  components/       shared UI (StateViews, PeriodSelector) + components/ui (shadcn primitives)
  layouts/          ManagerLayout (bottom nav), AdminLayout (sidebar/drawer)
  pages/            route-level screens, split into admin/ and manager/
  features/         feature UI grouped by domain (members, donations, followups, managers, dashboard, reports)
  hooks/            TanStack Query hooks, one per service
  services/         typed Supabase data-access, one file per table — the only place that calls supabase-js directly
  schemas/          Zod schemas shared by forms and CSV import validation
  types/            hand-authored Database type (see comment in database.ts for how to regenerate) + app types
  contexts/         SupabaseContext (Clerk-bound client), ProfileContext (role resolution)
  routes/           route guards (UX convenience — RLS is the real authorization boundary) + the route table
  lib/              formatINR, tel/whatsapp link builders, CSV parse/build, friendly error mapping

api/
  webhooks/clerk.ts  the only serverless function — provisions a profiles row when someone signs in

supabase/
  migrations/        numbered SQL migrations (schema, functions, RLS, seed, dashboard aggregates)
  seed.sql            dev/test-only sample data (never applied to production)
```

## Why only one serverless function

Reads and writes go straight from the browser to Supabase via `supabase-js`, authorized entirely by Postgres RLS reading the Clerk session JWT (see `supabase/migrations/0003_rls.sql`). The Clerk webhook is the only operation that genuinely needs a server-side `service_role` key — everything else, including CSV member import, is a normal RLS-authorized client call (a multi-row `INSERT` is already atomic in Postgres, so no separate transactional endpoint was needed for import).

## Known limitation

CSV import only — the `xlsx` npm package currently ships with unpatched high-severity advisories (prototype pollution, ReDoS) with no fix available, so it was deliberately left out. Ask Admin to export Excel sheets to CSV before importing.
