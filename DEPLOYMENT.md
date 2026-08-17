# Deployment Guide — Al Ansar Foundation

Complete, from-scratch instructions for standing up Supabase, Clerk, and Vercel for this
project, plus how to change any of that configuration later. If you're doing this for the
first time, work through sections 1–9 in order — later steps depend on values collected in
earlier ones.

## Contents

1. [Architecture at a glance](#1-architecture-at-a-glance)
2. [Prerequisites](#2-prerequisites)
3. [Supabase setup](#3-supabase-setup)
4. [Clerk setup](#4-clerk-setup)
5. [Environment variables reference](#5-environment-variables-reference)
6. [Local development](#6-local-development)
7. [GitHub](#7-github)
8. [Vercel deployment](#8-vercel-deployment)
9. [Post-deploy wiring](#9-post-deploy-wiring)
10. [Verification checklist](#10-verification-checklist)
11. [Changing configuration later](#11-changing-configuration-later)
12. [Troubleshooting](#12-troubleshooting)
13. [Security checklist](#13-security-checklist)

---

## 1. Architecture at a glance

- **Clerk authenticates. A server-side API layer authorizes.** Clerk only proves who signed
  in. The browser **never talks to Supabase directly** — Supabase's Third-Party Auth
  integration with Clerk has been removed. Every screen instead calls a Vercel serverless
  function under `api/*.ts`, which verifies the caller's Clerk session token itself
  (`@clerk/backend`'s `verifyToken`), resolves their `profiles.role`/`manager_id` using the
  Supabase **service-role key** (which bypasses Row-Level Security entirely), and enforces
  who can see or write what **in TypeScript** — see `api/_lib/auth.ts`. Row-Level Security is
  still enabled in Postgres as defense-in-depth (`0003_rls.sql`), but it is no longer what
  actually protects anything, since the service role bypasses it by design; the API layer's
  own checks are the real authorization boundary now.
  ```
  React/Vite  →  Clerk (proves identity)  →  api/*.ts  →  verify Clerk token + resolve role
                                                        →  Supabase (service-role key)
  ```
- **`SUPABASE_SERVICE_ROLE_KEY` is required for local dev now, not just production.**
  Self-provisioning (turning a Clerk sign-in into a `profiles` row) used to run entirely
  client-side against Supabase directly, which worked on localhost with zero server-only
  config. It now runs inside `api/profile.ts` (`getOrProvisionProfile` in `api/_lib/auth.ts`),
  so local development needs `vercel dev` (not plain `vite`) plus the server-only variables
  from §5 filled in — see §6.
- **One custom login page**, not Clerk's prebuilt `<SignIn/>` — see `src/pages/LoginPage.tsx`.
  It adapts to whatever sign-in methods your Clerk instance has enabled (Google OAuth,
  password, or email code) rather than assuming one.
- The Clerk webhook (`api/webhooks/clerk.ts`) still exists as a production nicety — it
  provisions a `profiles` row the moment Clerk fires `user.created`/`user.updated`, slightly
  ahead of the person's first API call — but nothing depends on it; `api/profile.ts`
  self-provisions on first call regardless of whether the webhook ever fired.

---

## 2. Prerequisites

- Node.js 20+ and npm
- Accounts on [supabase.com](https://supabase.com), [clerk.com](https://clerk.com), and
  [vercel.com](https://vercel.com)
- A GitHub repo to deploy from — this project already lives at
  `github.com/alansaradmin-art/al-ansar-foundation`

---

## 3. Supabase setup

### 3.1 Create the project

Create a new project at supabase.com. Pick a region close to India for latency. Note the
database password it generates — you won't need it for anything in this app (we never
connect directly to Postgres outside of Supabase's own API layer), but keep it somewhere
safe in case you ever need `psql`/CLI access.

### 3.2 Run the migrations, in order

Open **SQL Editor** in the Supabase dashboard and run each file in `supabase/migrations/`
in numeric order. Paste-and-run one at a time, or concatenate them into a single paste —
either works, they're idempotent-safe with `create or replace`.

| File                                     | What it does                                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `0001_schema.sql`                        | Creates all 7 tables, indexes, constraints                                                            |
| `0002_functions.sql`                     | `current_profile()`, `is_admin()`, `is_pending_followup()`, audit-log triggers, `updated_at` triggers |
| `0003_rls.sql`                           | Row-Level Security policies — the real authorization boundary                                         |
| `0004_seed.sql`                          | Seeds `app_settings` (pending-followup cutoff day) and the 11 managers                                |
| `0005_donation_id_sequence.sql`          | Auto-generates `donation_id` (`D000001`, ...)                                                         |
| `0006_dashboard_functions.sql`           | Server-side aggregation for dashboards/reports                                                        |
| `0007_self_provisioning.sql`             | `provision_my_profile()` — client-callable self-provisioning                                          |
| `0008_reprovision_on_email_conflict.sql` | Makes re-signup (after a deleted Clerk user) re-link instead of erroring                              |
| `0009_auto_member_id.sql`                | Auto-generates `member_id` (`AF-0001`, ...)                                                           |
| `0010_pending_followup_batch.sql`        | Batched pending-status lookup for list views                                                          |
| `0011_drop_audit_triggers.sql`           | Removes the audit-log triggers (broken once nothing presents a Clerk JWT to Postgres — the API layer writes `audit_logs` itself now, see §1) |
| `0012_drop_provision_my_profile.sql`     | Removes `provision_my_profile()` — **run this one last relative to the cutover below**, only after `api/profile.ts` is deployed and verified working (see the note below the table) |
| `0013_nullable_donation_member.sql`      | Drops `NOT NULL` on `donations.member_id` — enables Admin-only anonymous donations                     |
| `0014_donation_type.sql`                 | Adds the mandatory `donation_type` column (Zakat/Sadaqah/Fitra/General/Other)                          |
| `0015_pending_followups_recency_sort.sql`| `list_pending_followups()` now orders by `updated_at desc` instead of member name                     |
| `0016_dashboard_attention_and_type_filter.sql` | Adds an optional donation-type filter to the report RPCs, plus `members_needing_attention()` for the Admin Dashboard |
| `0017_manager_dashboard_donation_types.sql` | Adds a per-manager donation-type breakdown to `manager_dashboard_stats()` (drop+recreate — its return columns changed) |

**`0012` has an ordering requirement the others don't**: if you're setting up a **brand-new**
project, run all seventeen in order, there's nothing to sequence around. If you're **migrating
an existing deployment** off Supabase Third-Party Auth, don't run `0012` until the new API layer
(`api/profile.ts` and friends) is deployed and you've confirmed sign-in works end-to-end — the
old client-side code path calls this function on every sign-in until that cutover ships. Every
migration after `0012` (`0013`–`0017`) is a normal, unordered feature addition — run them
whenever you pull the corresponding code, no special sequencing needed.

**Note on the seed data:** the original manager list had both "Anwarul Haque" and
"Mohammad Anwar" down for the same email (`anwar@gmail.com`). `0004_seed.sql` seeds Mohammad
Anwar with a placeholder (`anwar.m@gmail.com`) so setup isn't blocked — go to
**Admin → Managers** and correct it to his real email before inviting him in Clerk.

Prefer the CLI? This repo has `supabase` as a dev dependency:

```
npx supabase login
npx supabase link --project-ref <your-project-ref>   # found in the Supabase dashboard URL
npx supabase db push
```

### 3.3 Third-Party Auth — not used, do not set this up

Earlier versions of this app connected Clerk to Supabase as a **Third-Party Auth** provider
(Supabase Dashboard → Authentication → Sign In / Providers) so Postgres could read
`auth.jwt()->>'sub'` directly from a Clerk session token presented by the browser. **This has
been removed.** The browser no longer talks to Supabase at all — every request goes through
`api/*.ts`, which authenticates the caller itself and talks to Supabase using the
service-role key (§3.4), which doesn't need or use this connection. Skip this step entirely;
if you're maintaining an older deployment that still has it configured, it's harmless to
leave connected (nothing uses it) or you can remove it from Supabase Dashboard →
Authentication → Third-Party Auth once you've verified the new API layer end-to-end.

### 3.4 Collect your keys

Supabase Dashboard → **Project Settings → Data API**:

- **Project URL** → `VITE_SUPABASE_URL` (despite the `VITE_` prefix, this is read **only** by
  `api/*.ts` now — server-only, see §5. The name is kept for historical continuity; Node's
  `process.env` reads it the same regardless of the prefix.)

Supabase Dashboard → **Project Settings → API → Service Role**:

- **`service_role` key** → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never in a `VITE_` var,
  never in the browser — this key bypasses RLS entirely, and is now the **only** thing that
  connects to Supabase, from `api/*.ts`)

There is no anon/public key to collect anymore — nothing in this project uses one.

### 3.5 Optional: dev/test seed data

`supabase/seed.sql` adds sample members/donations/follow-ups covering the scenarios from the
original spec (donation-only, follow-up-only, both, NOT_INTERESTED, missing phone numbers,
inactive member). **Never run this against your production project** — it's for a local or
throwaway Supabase project only.

---

## 4. Clerk setup

### 4.1 Create the application

Create a new application at clerk.com. Name it whatever you like — the in-app branding
("Al Ansar Foundation") is hardcoded in the React app, not derived from the Clerk app name.

### 4.2 Choose sign-in methods

The custom login page (`src/pages/LoginPage.tsx`) adapts to whatever you enable here — you
don't need to touch app code when you change this:

- **Google OAuth** (recommended, and what the Foundation Admin account currently uses) —
  Clerk Dashboard → **Configure → SSO Connections** → enable Google.
- **Email code (OTP)** or **Password** as a fallback — Clerk Dashboard → **Configure →
  Email, Phone, Username**. The login page checks which factors Clerk reports as available
  for each email and shows the matching step (password field, or a 6-digit code field)
  automatically.

### 4.3 Connect Supabase (Third-Party Auth) — not needed

This step no longer applies — see §3.3. Nothing in Clerk needs to know about Supabase; the
two only meet inside `api/_lib/auth.ts`, server-side.

### 4.4 Collect your keys

Clerk Dashboard → **API Keys**:

- **Publishable key** → `VITE_CLERK_PUBLISHABLE_KEY`
- **Secret key** → `CLERK_SECRET_KEY` (server-only; used by the webhook function)

### 4.5 Invite users

Clerk Dashboard → **Users** → **Invite**. Invite:

- The Foundation Admin, at exactly the email in `FOUNDATION_ADMIN_EMAIL` (default
  `alansar.admin@gmail.com`)
- Each of the 11 managers, at exactly the email already sitting in the `managers` table
  (check **Admin → Managers** in the app for the current list, especially if you corrected
  Mohammad Anwar's placeholder email per §3.2)

When someone accepts and signs in for the first time, self-provisioning (or the webhook, in
production) links them automatically — no manual database work needed.

### 4.6 Webhook — set this up after your first Vercel deploy

Covered in [§9](#9-post-deploy-wiring), since it needs your live Vercel URL first.

---

## 5. Environment variables reference

| Variable                       | Client or server        | Source                                            |
| ------------------------------ | ----------------------- | ------------------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY`   | Client (safe to expose) | Clerk → API Keys                                  |
| `VITE_CLERK_PROXY_URL`         | Client, production only (§9.3) | Clerk Dashboard → Domains                   |
| `VITE_SUPABASE_URL`            | **Server-only** (`api/*.ts`) | Supabase → Project Settings → Data API        |
| `SUPABASE_SERVICE_ROLE_KEY`    | **Server-only**         | Supabase → Project Settings → API → Service Role  |
| `CLERK_SECRET_KEY`             | **Server-only**         | Clerk → API Keys — verifies every `api/*.ts` request now (`api/_lib/auth.ts`), not just the webhook |
| `CLERK_WEBHOOK_SIGNING_SECRET` | **Server-only**         | Clerk → Webhooks (set up in §9)                   |
| `CLERK_PROXY_UPSTREAM`         | **Server-only**, optional (§9.3) | Clerk Dashboard → Domains → "Copy setup instructions" |
| `FOUNDATION_ADMIN_EMAIL`       | **Server-only**         | You choose it — default `alansar.admin@gmail.com` |
| `CRON_SECRET`                  | **Server-only**         | You generate it (§9.4) — any long random string    |

Anything **not** prefixed `VITE_` never reaches the browser bundle — Vite only inlines
`VITE_*` variables at build time. `VITE_SUPABASE_URL` is the one deliberate exception to read
carefully: it keeps its historical `VITE_` name, but is read **only** server-side now
(`process.env`, inside `api/*.ts` — Node reads it the same regardless of the prefix; the
prefix only controls what Vite inlines into the browser bundle). Nothing in `src/` reads it.
There is no Supabase anon key anywhere in this project anymore — don't reintroduce
`VITE_SUPABASE_ANON_KEY`.

---

## 6. Local development

Use `npm run dev:api` (which runs `vercel dev`), not plain `npm run dev` (`vite`), to get
sign-in and any real data working locally — this project's data access lives in `api/*.ts`,
which plain `vite` never serves (there's no dev-server proxy for it). `vercel dev` runs the
Vite dev server **and** every `api/*.ts` function together on one port.

```
npm install
cp .env.example .env.local
# fill in VITE_CLERK_PUBLISHABLE_KEY (§4.4), VITE_SUPABASE_URL and
# SUPABASE_SERVICE_ROLE_KEY (§3.4), and CLERK_SECRET_KEY (§4.4) — all four
# are required now, not optional, since api/_lib/auth.ts runs locally too
npm run dev:api
```

**Important:** `package.json`'s `dev` script must stay `vite`, not `vercel dev` — `vercel dev`
determines what underlying dev server to proxy to by reading that same `dev` script (or the
linked Vercel project's Development Command setting), and if it resolves back to `vercel dev`
itself, it correctly refuses with `Error: vercel dev must not recursively invoke itself`.
`dev:api` is the wrapper script that actually invokes `vercel dev`; `dev` is what `vercel dev`
delegates *to*. Don't rename or merge these two.

The first time you run `npm run dev:api`, `vercel dev` will prompt you to log in and may ask
to link the local folder to a Vercel project (`vercel link`) — either link it to the real
project or create a throwaway link if you'd rather not yet; it only affects `vercel dev`'s own
bookkeeping (a local `.vercel/` folder, already gitignored), not what gets deployed.

If you only need the frontend (no sign-in, no data — rare, mostly for pure UI work), plain
`npm run dev` runs `vite` without the API layer, same as before this project had an API layer.

---

## 7. GitHub

Already set up: [github.com/alansaradmin-art/al-ansar-foundation](https://github.com/alansaradmin-art/al-ansar-foundation)
(public). To push future changes:

```
git add <files>
git commit -m "..."
git push
```

Vercel redeploys automatically on every push to `main` once connected (§8).

---

## 8. Vercel deployment

### 8.1 Import the project

[vercel.com/new](https://vercel.com/new) → **Import** → select
`alansaradmin-art/al-ansar-foundation`. Vercel auto-detects the **Vite** framework preset;
build command and output directory (`dist`) are filled in correctly by default.

`vercel.json` in the repo root adds the SPA rewrite rule so client-side routes (e.g.
`/manager/members/...`) don't 404 on a hard refresh, while leaving every file under `api/`
(the whole data-access layer — `members.ts`, `donations.ts`, `followups.ts`, `managers.ts`,
`dashboard.ts`, `settings.ts`, `audit-logs.ts`, `profile.ts`, plus `webhooks/clerk.ts` and
`clerk-proxy.ts`) routed to their actual serverless functions, each a plain statically-named
file dispatching on HTTP method + query params (see the note under §9.3 on why — a
Next.js-style dynamic `[...path].ts` filename doesn't reliably deploy as a function on this
project).

### 8.2 Add environment variables

**Settings → Environment Variables**, add every variable from §5 that you have a value for
already — except leave `CLERK_WEBHOOK_SIGNING_SECRET` blank for now (you don't have it yet)
and `VITE_CLERK_PROXY_URL`/`CLERK_PROXY_UPSTREAM` blank unless you already know you need the
reverse proxy (§9.3 — most setups using a Development-instance key don't).

### 8.3 Deploy

Click **Deploy**. Vercel gives you a domain like `al-ansar-foundation.vercel.app` — note it
down, you need it for §9.

### 8.4 Optional: custom domain

**Settings → Domains** → add your own domain and follow the DNS instructions Vercel gives
you. Everything in §9 below should use your final custom domain if you set one up, not the
`.vercel.app` one.

---

## 9. Post-deploy wiring

Two things only work once you have a real deployed URL — do these right after your first
successful deploy.

### 9.1 Clerk webhook

1. Clerk Dashboard → **Webhooks** → **Add Endpoint**
2. URL: `https://al-ansar-foundation.vercel.app/api/webhooks/clerk`
3. Subscribe to `user.created` and `user.updated`
4. Copy the **Signing Secret** → Vercel → **Settings → Environment Variables** → add as
   `CLERK_WEBHOOK_SIGNING_SECRET`
5. Vercel → **Deployments** → **Redeploy** the latest deployment — env var changes don't
   apply retroactively to a running deployment, only to new ones

### 9.2 Clerk allowed origins (for Google OAuth)

Clerk Dashboard → **Configure → Domains** (naming may vary slightly by Clerk plan/version)
→ confirm your production domain is listed as an allowed origin/redirect target. If Google
sign-in throws a redirect-mismatch error in production but works locally, this is almost
always why.

### 9.3 Clerk reverse proxy — only if using a Production instance on `*.vercel.app`

Skip this whole section if you're using a Clerk **Development**-instance key in production
(§12, "failed_to_load_clerk_js") — that's the simpler path and needs no proxy.

A Clerk **Production** instance normally needs a `clerk.<domain>` DNS record, which you
can't add under a shared domain like `*.vercel.app` since you don't control its DNS. Clerk's
alternative for exactly this case is a reverse proxy: your own app forwards a specific path
(`/__clerk/*`) to Clerk's Frontend API, and Clerk's client-side JS is told to talk to that
path instead of a `clerk.<domain>` host directly.

**Important:** this must be a real proxy, not a declarative rewrite to an external URL.
Vercel's `rewrites` only proxy external destinations as a simple GET passthrough — POSTs
like `/v1/client/sign_ins` (i.e. every actual sign-in attempt) come back `501 Not
Implemented`. This repo implements the proxy as an actual serverless function instead:

- `api/clerk-proxy.ts` — a plain, statically-named function (**not**
  `api/__clerk/[...path].ts`, Vercel's Next.js-style dynamic catch-all filename convention —
  that stopped working on this project: every `/__clerk/*` request 404'd at Vercel's platform
  level, confirmed even in a deployment proven to be live, since removing `vercel.json`'s SPA
  catch-all correctly broke `/login` in that same deploy while `/__clerk/__debug` kept
  404ing). Forwards any method (GET/POST/PUT/PATCH/DELETE/OPTIONS), the full body, headers,
  and cookies. This covers both `/__clerk/v1/*` (the actual Frontend API calls) **and**
  `/__clerk/npm/@clerk/clerk-js@.../dist/clerk.browser.js` (Clerk's own SDK deliberately loads
  its bootstrap script through the configured proxy too — confirmed from `@clerk/shared`'s
  source, not an assumption). Adds the `Clerk-Proxy-Url` header Clerk's proxy handshake
  expects and relays `Set-Cookie` headers back correctly (including multiple cookies in one
  response, which naive proxies often drop).
  The wildcard path segment is read from the `path` **query parameter** (`req.query.path`),
  not from the request URL or a dynamic filename — Vercel's oldest and most
  universally-documented rewrite mechanism (`destination: "...?param=:capture"`), independent
  of any framework-specific file-routing convention.
  The proxy's **upstream host** — where it actually forwards requests to — is resolved in
  priority order:
  1. **`CLERK_PROXY_UPSTREAM`** (server-only env var) if set — the reliable source of truth.
     Get the exact value from Clerk Dashboard → **Domains** → your proxy row → **"Copy setup
     instructions"**. Set this whenever you have it; it always wins.
  2. Otherwise, **decoded from `VITE_CLERK_PUBLISHABLE_KEY` itself** (same algorithm Clerk's
     own SDK uses internally for *direct*, non-proxy mode — see the comment in the file). This
     is a reasonable fallback but is **not guaranteed to equal the real proxy-mode upstream**
     — Clerk's proxy target is account-specific and only reliably known via the dashboard.
  Visit `https://<your-domain>/__clerk/__debug` (a safe, no-secret GET — never called by
  Clerk itself) to see exactly what the deployed function resolved: the upstream it will
  forward to, which of the two sources produced it, and the public proxy URL it's telling
  Clerk to use. Check this *before* testing a real sign-in whenever `failed_to_load_clerk_js`
  comes back — it tells you immediately whether the problem is "wrong upstream" (fix with
  `CLERK_PROXY_UPSTREAM`) or something else (routing, keys, Clerk-side config).
  If the upstream is simply unreachable (DNS/network failure), the proxy returns a `502`
  whose body states the exact upstream URL it tried and the underlying fetch error, instead
  of a generic message — check the Network tab response body, not just the status.
- `vercel.json` rewrites the *public* path `/__clerk/:path*` to the function, passing the
  captured wildcard through as a query parameter:
  ```json
  { "source": "/__clerk/:path*", "destination": "/api/clerk-proxy?path=:path*" }
  ```
  This is an internal rewrite (not to an external URL), so it has no method/body restriction,
  and it sits *before* the SPA catch-all rule in the rewrites array — Vercel evaluates
  rewrites in order, so `/__clerk/*` always matches this rule first regardless of the catch-all
  below it.

**If every `/__clerk/*` URL 404s** with Vercel's own generic "The page could not be found"
body and an `X-Vercel-Error: NOT_FOUND` header (not JSON or a proxy-generated error) — that
means Vercel isn't routing to the function at all. Rule out a stale deployment first: compare
the live site's `assets/index-*.js` filename (view source, or `curl`) against your latest
local build — if they differ, or if a change you know should affect behavior (like removing
the SPA catch-all) doesn't show up live, no new deployment has actually run. Check Vercel
Dashboard → **Deployments** for one matching your latest commit SHA, and **Settings → Git**
that the repo/branch is actually connected. If a fresh deployment *is* confirmed live and
`/__clerk/*` still 404s, also confirm `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
`VITE_CLERK_PROXY_URL`, and (if set) `CLERK_PROXY_UPSTREAM` are attached to the **Production**
environment specifically — Vercel scopes variables per environment, so a value only saved
under Preview never reaches the production domain.

Setup:

1. Clerk Dashboard → **Domains** → confirms your `*.vercel.app` domain and shows the exact
   **Clerk proxy URL** it expects (`https://<your-domain>/__clerk`) — copy the **upstream**
   value too (via "Copy setup instructions") if the dashboard shows one explicitly.
2. Set `VITE_CLERK_PROXY_URL` in Vercel to that exact proxy URL (e.g.
   `https://al-ansar-foundation.vercel.app/__clerk`) — **production environment only**, leave
   it unset locally.
3. If Clerk's dashboard gave you an explicit upstream/Frontend API value, set
   `CLERK_PROXY_UPSTREAM` in Vercel to it (server-only, e.g. `https://frontend-api.clerk.dev`
   or whatever the dashboard shows — no trailing slash needed). If unsure, leave it unset
   first and check `/__clerk/__debug` after deploying — add it only if the decoded fallback
   turns out wrong.
4. Make sure `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Vercel are the
   **Production** instance's keys, not the Development ones — a Development key never needs
   a proxy, so setting `VITE_CLERK_PROXY_URL` alongside a dev key does nothing useful.
   `CLERK_SECRET_KEY` is also read directly by `api/clerk-proxy.ts` now, server-side only.
5. Redeploy, check `https://<your-domain>/__clerk/__debug` resolves the upstream you expect,
   then click **Verify proxy** in Clerk Dashboard → Domains, and specifically test a real
   sign-in (not just that the page loads) — the original bug only showed up on POST.

### 9.4 Member inactivity cron job

`api/cron/deactivate-stale-members.ts` runs daily (`vercel.json`'s `crons` entry, `0 21 * * *`
— 21:00 UTC, off-peak) and flags any `ACTIVE` member `INACTIVE` once their latest non-deleted
donation (or, for a member who's never donated, their join date) is more than 3 months old.
It has no Clerk session to verify (Vercel invokes it on a schedule, not a signed-in user), so
it instead checks `Authorization: Bearer <CRON_SECRET>` — the header Vercel automatically
attaches to cron-triggered requests once `CRON_SECRET` is set.

1. Generate any long random string and set it as `CRON_SECRET` in Vercel → **Settings →
   Environment Variables** (server-only, all environments you deploy crons to). Without it,
   the endpoint fails closed (401) — including for Vercel's own scheduler.
2. Redeploy — Vercel only registers `vercel.json`'s `crons` entry on a fresh deployment.
3. There's no local Vercel Cron trigger to test against. To verify manually after deploy:
   `curl -H "Authorization: Bearer <CRON_SECRET>" https://<your-domain>/api/cron/deactivate-stale-members`
   — expect `{"deactivated": <n>}`. A member it flags shows `INACTIVE` immediately in the app,
   and their Audit Log entry shows actor **System**.

---

## 10. Verification checklist

- [ ] `https://<your-domain>/login` loads the custom login page (not a blank screen or a
      generic Clerk page)
- [ ] Signing in as the Foundation Admin lands on `/admin`
- [ ] Signing in as a manager lands on `/manager`
- [ ] Visiting `/manager/*` or `/admin/*` while signed out redirects to `/login`
- [ ] Visiting `/login` while already signed in redirects to the correct dashboard
- [ ] The user menu (top-right avatar) shows the correct name/email/role, and Logout works
- [ ] Recording a donation and completing a follow-up both work and show up immediately
- [ ] Deleting a Clerk user and having them sign up again re-links instead of erroring
      (tests `0008_reprovision_on_email_conflict.sql`)
- [ ] Browser console has no errors on the main screens
- [ ] A manager can only see their own members/donations/follow-ups — the Members list,
      Donations list, Follow-ups list, Pending Follow-ups, and the member picker inside
      "Record a donation" never show another manager's members (this is enforced by
      `api/_lib/auth.ts`'s `resolveManagerScope`, not by anything in the browser — worth
      actually checking with two manager test accounts, not just trusting the code)
- [ ] Recording a donation as a manager for a member NOT assigned to them is rejected (403)
- [ ] A brand-new sign-in (no `profiles` row yet) self-provisions correctly via `GET
      /api/profile` — check the Network tab, not just that the app loads

---

## 11. Changing configuration later

### Change the Foundation Admin email

```sql
update app_settings set value = '"newemail@example.com"' where key = 'FOUNDATION_ADMIN_EMAIL';
```

Also update the `FOUNDATION_ADMIN_EMAIL` environment variable in Vercel (used by the
webhook) and redeploy. The old admin's `profiles` row isn't automatically changed — update
or delete it manually in the `profiles` table if the person is actually leaving the role.

### Add, edit, or deactivate a manager

Do this in the app: **Admin → Managers**. No database or Clerk console work needed — a
manager's `profiles` row links automatically the next time they sign in, matched by email
against the `managers` table.

### Rotate the Supabase service role key or Clerk secret key

Generate a new key in the respective dashboard, update the corresponding Vercel environment
variable, redeploy. `SUPABASE_SERVICE_ROLE_KEY` is read by every `api/*.ts` file via
`api/_lib/auth.ts`'s `getServiceRoleClient()`; `CLERK_SECRET_KEY` is read by
`api/_lib/auth.ts` (verifying every request), `api/webhooks/clerk.ts`, and
`api/clerk-proxy.ts`. Redeploy after rotating either — a running deployment doesn't pick up
new environment variable values retroactively.

### Migrate to a brand-new Supabase project

1. Create the new project and run through all of §3 against it (migrations, keys — skip
   §3.3, it's not used).
2. Update `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel (and your local
   `.env.local`).
3. Redeploy.
4. Existing Clerk users will self-provision fresh `profiles` rows in the new database on
   their next sign-in — no data carries over automatically. If you need historical
   members/donations/follow-ups preserved, export/import that data yourself before cutting
   over (`pg_dump`/`pg_restore`, or CSV export/import through the app's own Members import
   for the `members` table specifically).

### Migrate to a brand-new Clerk application

1. Create the new Clerk app, reconfigure sign-in methods (§4.2), re-invite everyone (§4.5).
   Skip §4.3 — there's nothing to reconnect.
2. Update `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Vercel and locally.
3. Re-create the webhook (§9.1) against the new Clerk app — signing secrets are per-app and
   don't carry over.
4. Everyone's `clerk_user_id` changes with a new Clerk app, so every `profiles` row needs to
   re-link. This happens automatically per-user on their next sign-in (same self-provisioning
   flow as a fresh install, now running inside `api/profile.ts`) as long as the emails match
   what's already in `managers` / `FOUNDATION_ADMIN_EMAIL` — no manual database work
   required, just re-inviting people.

### Change the pending-follow-up cutoff day

**Admin → Settings** in the app. No deploy needed — it's a live row in `app_settings`.

---

## 12. Troubleshooting

**"Account not set up yet" for someone who should have access** — check, in order: (1) did
the migrations actually run (`select * from managers;` should return 11 rows), (2) is their
email in `managers.email` (or matches `FOUNDATION_ADMIN_EMAIL`) exactly, (3) is
`managers.status` for them `ACTIVE`.

**401 errors in the browser console / the app is stuck loading for everyone** — the API
layer (`api/_lib/auth.ts`) can't verify the caller's Clerk session token. Check: (1)
`CLERK_SECRET_KEY` in Vercel matches the same Clerk instance as `VITE_CLERK_PUBLISHABLE_KEY`
(a Development publishable key with a Production secret key, or vice versa, fails
verification), (2) both are attached to the environment you're testing (Production vs
Preview — Vercel scopes variables per environment), (3) if running locally, that you ran
`npm run dev:api` (§6), not plain `npm run dev` — plain `vite` never serves `api/*.ts` at
all, so every call 404s before it ever gets to the 401 check.

**`Error: vercel dev must not recursively invoke itself`** — `package.json`'s `dev` script
was changed to `vercel dev` instead of staying `vite`. See the note in §6 — `dev` must stay
`vite` (what `vercel dev` proxies to); `dev:api` is the script that runs `vercel dev` itself.

**500 errors from `api/*.ts`, or the app is stuck loading for everyone** — `VITE_SUPABASE_URL`
or `SUPABASE_SERVICE_ROLE_KEY` is missing/wrong in Vercel's environment variables (or your
local `.env.local` under `vercel dev`) — check Vercel's function logs for the exact error
(`api/_lib/auth.ts`'s `getServiceRoleClient()` throws a specific message for this).

**Every `api/*.ts` endpoint returns Vercel's generic `FUNCTION_INVOCATION_FAILED` page
(plain text, not JSON) — even a request with no `Authorization` header at all** — the
function is crashing at *import time*, before any of this repo's own request-handling code
runs (a genuine auth/validation failure from this app's own code always returns a proper
JSON `{error:{...}}` body, never Vercel's generic crash page). The HTTP response never shows
the actual error for this — you have to pull it from Vercel's logs directly:
```
npx vercel login          # if not already authenticated
npx vercel logs https://<your-domain>
```
then trigger the failing request again in another terminal/tab while `vercel logs` is
tailing — the real stack trace appears there even though the browser only ever sees the
generic crash page.

**Root cause hit during this app's own migration to the API layer, in case it recurs**: every
`api/*.ts` file imports local sibling files with an *extensionless* specifier
(`from './_lib/auth'`), which is normal, idiomatic TypeScript — but this project has `"type":
"module"` in `package.json`, and Vercel does **not** bundle each function into a single file;
it transpiles each `.ts` file individually and lets Node's native ESM loader resolve the
`import` statements at runtime. Node's ESM loader (unlike CommonJS `require`, and unlike a
bundler) refuses to resolve an extensionless relative specifier — the actual error was
`Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/api/_lib/http' imported from
/var/task/api/profile.js`. **Every relative import of a runtime value (not a `import type`-only
import, which is erased entirely and needs no extension) between files under `api/` must use
an explicit `.js` extension**, even though the source file is `.ts` — e.g. `from
'./_lib/auth.js'`, not `from './_lib/auth'`. This is why `api/clerk-proxy.ts` and
`api/webhooks/clerk.ts` were unaffected — neither has any relative import to another local
file, only to `node_modules` packages, which resolve differently.

**"This record already exists" when a deleted-and-recreated Clerk user signs in** — confirm
migration `0008_reprovision_on_email_conflict.sql` has been applied; it makes re-signup
re-link instead of erroring on the `profiles.email` unique constraint.

**Clerk webhook returns errors, but self-provisioning still works fine** — that's expected
and non-fatal; self-provisioning is the primary mechanism (§1). Check `CLERK_WEBHOOK_SIGNING_SECRET`
is set and you redeployed after adding it (§9.1).

**Google sign-in redirect fails in production only** — see §9.2.

**Console shows `failed_to_load_clerk_js` and the browser is requesting something like
`https://clerk.<your-vercel-domain>.vercel.app/npm/@clerk/clerk-js@5/dist/clerk.browser.js`**
— `@clerk/clerk-react` derives the Frontend API host it loads `clerk.browser.js` from by
decoding the Publishable Key itself, unless a `proxyUrl`/`domain` prop overrides it (this
app's `ClerkProvider` passes `proxyUrl` from `VITE_CLERK_PROXY_URL` when it's set — see
§9.3). This means the `VITE_CLERK_PUBLISHABLE_KEY` set in Vercel is a **Production**-instance
key that was configured with `*.vercel.app` as its domain — which you don't own DNS for, so
the direct `clerk.<domain>` CNAME can never resolve. Two ways to fix it:
- **Simpler:** in Vercel, replace `VITE_CLERK_PUBLISHABLE_KEY` with your Clerk
  **Development**-instance key (works on any host, zero setup — same key already used in
  local `.env.local`) and redeploy.
- **If you specifically want the Production instance:** set up the reverse proxy instead —
  see §9.3 — rather than a direct custom domain, unless you also own a real domain to point
  at Clerk's DNS requirements (§8.4).

If you already set up the proxy (§9.3) and still see this error, the proxy is very likely
forwarding to the wrong upstream — the key-decode fallback can resolve to the same
non-existent `clerk.<your-domain>` host that caused the error in the first place, since that's
exactly what a Production key configured for a domain-you-don't-own decodes to. Visit
`https://<your-domain>/__clerk/__debug` to see what upstream the proxy actually resolved, and
set `CLERK_PROXY_UPSTREAM` (§9.3, step 3) to override it with the real value from Clerk
Dashboard → Domains → "Copy setup instructions" if it looks wrong.

Verify what a key resolves to before deploying it:
```
node -e "console.log(Buffer.from(process.argv[1].replace(/^pk_(test|live)_/, ''), 'base64').toString('utf8'))" "<paste the key>"
```

**A SQL migration errors on `generate_series`/`smallint` type mismatches** if you're writing
new ones — Postgres won't implicitly narrow `integer` to `smallint` for function argument
resolution; cast explicitly (see the comments in `0006_dashboard_functions.sql` for a worked
example) and avoid casting `generate_series()`'s arguments directly (ambiguous overload) —
cast the _result_ instead.

---

## 13. Security checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`,
      `CRON_SECRET` are set only in Vercel's environment variables — never in a `VITE_` var,
      never committed to git
- [ ] `.env.local` is gitignored (already is — verify with `git status` if unsure)
- [ ] Every `api/*.ts` resource file (everything except `profile.ts`) calls `authenticate()`
      from `api/_lib/auth.ts` before touching Supabase, and every admin-only operation calls
      `requireAdmin()` — a new endpoint added later needs both, or it's reachable by any
      signed-in user regardless of role
- [ ] Manager-scoped reads/writes always derive the manager's own `manager_id` server-side
      via `resolveManagerScope()` — never trust a `managerId` the client sent (a manager
      passing another manager's id must never widen what they can see)
- [ ] Every mutation that stamps "who did this" (`recorded_by`, `created_by`, `deleted_by`,
      `updated_by`, `actor_profile_id`) sets it from the authenticated caller's own profile
      id server-side — never from a client-supplied value in the request body
- [ ] RLS is still enabled on every table (it is, by `0003_rls.sql`) as defense-in-depth, even
      though the service role bypasses it — a new table added later still needs its own
      policies for that defense-in-depth to mean anything
- [ ] `audit_logs` has no `INSERT`/`UPDATE`/`DELETE` grant for any client role, including
      Admin — only `api/_lib/auditLog.ts`, using the service-role key, ever writes to it
- [ ] The Clerk webhook endpoint verifies the `svix` signature before touching the database
      (already implemented in `api/webhooks/clerk.ts`) — never disable that check
- [ ] `getOrProvisionProfile()` (`api/_lib/auth.ts`) reads the caller's email from Clerk's
      Backend API (`clerkClient.users.getUser`), never from anything the client sent in a
      request body — a self-reported email would let someone provision themselves as ADMIN
      by lying about it
