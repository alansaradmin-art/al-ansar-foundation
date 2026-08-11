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

- **Clerk authenticates. Supabase authorizes.** Clerk only proves who signed in. The
  `profiles.role` column in Postgres (`ADMIN` / `MANAGER`) is the only thing that decides
  what they can see — enforced by Row-Level Security, not by the React app.
- **No custom backend.** The browser talks to Supabase directly via `supabase-js`, using
  Supabase's native "Third-Party Auth" trust relationship with Clerk so Postgres can read
  `auth.jwt()->>'sub'` directly from the Clerk session token. This is why step 3.3 below
  (connecting Clerk ↔ Supabase) is not optional — without it, every authenticated request
  gets a 401 and nothing in the app works.
- **Two ways a Clerk sign-in becomes a `profiles` row:**
  1. **Self-provisioning (primary, works everywhere, including localhost):** the app itself
     calls a Postgres function (`provision_my_profile`) the moment someone with no profile
     yet signs in. No deployment required for this to work.
  2. **Clerk webhook (production nicety):** `api/webhooks/clerk.ts`, the one Vercel
     serverless function in this project, does the same matching server-side whenever Clerk
     fires `user.created`/`user.updated`. Needs a public URL, so it only works once deployed.
- **One custom login page**, not Clerk's prebuilt `<SignIn/>` — see `src/pages/LoginPage.tsx`.
  It adapts to whatever sign-in methods your Clerk instance has enabled (Google OAuth,
  password, or email code) rather than assuming one.

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

| File | What it does |
|---|---|
| `0001_schema.sql` | Creates all 7 tables, indexes, constraints |
| `0002_functions.sql` | `current_profile()`, `is_admin()`, `is_pending_followup()`, audit-log triggers, `updated_at` triggers |
| `0003_rls.sql` | Row-Level Security policies — the real authorization boundary |
| `0004_seed.sql` | Seeds `app_settings` (pending-followup cutoff day) and the 11 managers |
| `0005_donation_id_sequence.sql` | Auto-generates `donation_id` (`D000001`, ...) |
| `0006_dashboard_functions.sql` | Server-side aggregation for dashboards/reports |
| `0007_self_provisioning.sql` | `provision_my_profile()` — client-callable self-provisioning |
| `0008_reprovision_on_email_conflict.sql` | Makes re-signup (after a deleted Clerk user) re-link instead of erroring |
| `0009_auto_member_id.sql` | Auto-generates `member_id` (`AF-0001`, ...) |
| `0010_pending_followup_batch.sql` | Batched pending-status lookup for list views |

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

### 3.3 Connect Clerk as a Third-Party Auth provider — critical step

This is the step that's easy to skip and hardest to diagnose if you do: without it, every
request from the app returns **401 "Invalid JWT"**, and the app gets stuck showing
"Account not set up yet" for everyone, because Postgres can't validate the token at all
(that failure gets misread as "no profile found" if you're not looking at the network tab).

1. Supabase Dashboard → **Authentication → Sign In / Providers → Third Party Auth**
2. **Add provider** → choose **Clerk**
3. You need your Clerk instance's domain for this — see step 4.3, they're two halves of the
   same handshake. Do this after step 4.1–4.2 if it's easier.

### 3.4 Collect your keys

Supabase Dashboard → **Project Settings → Data API**:
- **Project URL** → `VITE_SUPABASE_URL`
- **`anon` `public` key** → `VITE_SUPABASE_ANON_KEY` (safe to expose to the browser — RLS is
  what actually protects data, not this key)

Supabase Dashboard → **Project Settings → API → Service Role**:
- **`service_role` key** → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never in a `VITE_` var,
  never in the browser — this key bypasses RLS entirely)

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

### 4.3 Connect Supabase (Third-Party Auth)

Clerk Dashboard → **Configure → Integrations** → find **Supabase** → activate it. This
reveals a **Clerk domain** (looks like `https://your-app-name.clerk.accounts.dev`, or your
custom domain in production). Copy that value into the Supabase side from step 3.3.

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

| Variable | Client or server | Source |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Client (safe to expose) | Clerk → API Keys |
| `VITE_SUPABASE_URL` | Client (safe to expose) | Supabase → Project Settings → Data API |
| `VITE_SUPABASE_ANON_KEY` | Client (safe to expose) | Supabase → Project Settings → Data API |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | Supabase → Project Settings → API → Service Role |
| `CLERK_SECRET_KEY` | **Server-only** | Clerk → API Keys |
| `CLERK_WEBHOOK_SIGNING_SECRET` | **Server-only** | Clerk → Webhooks (set up in §9) |
| `FOUNDATION_ADMIN_EMAIL` | **Server-only** | You choose it — default `alansar.admin@gmail.com` |

Anything **not** prefixed `VITE_` never reaches the browser bundle — Vite only inlines
`VITE_*` variables at build time. This is why the four server-only variables above must
never be renamed to start with `VITE_`.

---

## 6. Local development

```
npm install
cp .env.example .env.local
# fill in the three VITE_ variables from §3.4 and §4.4
npm run dev
```

The four server-only variables aren't needed locally — self-provisioning (§3, §1) handles
sign-in without the webhook, so nothing in local dev calls it.

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
`/manager/members/...`) don't 404 on a hard refresh, while leaving `/api/webhooks/clerk`
routed to the actual serverless function.

### 8.2 Add environment variables

**Settings → Environment Variables**, add all seven from §5 — except leave
`CLERK_WEBHOOK_SIGNING_SECRET` blank for now, you don't have it yet.

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
2. URL: `https://<your-domain>/api/webhooks/clerk`
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
variable, redeploy. Nothing else references these keys — they're only read by
`api/webhooks/clerk.ts` at request time via `process.env`.

### Migrate to a brand-new Supabase project

1. Create the new project and run through all of §3 against it (migrations, Third-Party
   Auth, keys).
2. Update `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in
   Vercel (and your local `.env.local`).
3. Redeploy.
4. Existing Clerk users will self-provision fresh `profiles` rows in the new database on
   their next sign-in — no data carries over automatically. If you need historical
   members/donations/follow-ups preserved, export/import that data yourself before cutting
   over (`pg_dump`/`pg_restore`, or CSV export/import through the app's own Members import
   for the `members` table specifically).

### Migrate to a brand-new Clerk application

1. Create the new Clerk app, reconfigure sign-in methods (§4.2), reconnect it to Supabase's
   Third-Party Auth (§3.3/§4.3), re-invite everyone (§4.5).
2. Update `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Vercel and locally.
3. Re-create the webhook (§9.1) against the new Clerk app — signing secrets are per-app and
   don't carry over.
4. Everyone's `clerk_user_id` changes with a new Clerk app, so every `profiles` row needs to
   re-link. This happens automatically per-user on their next sign-in (same self-provisioning
   flow as a fresh install) as long as the emails match what's already in `managers` /
   `FOUNDATION_ADMIN_EMAIL` — no manual database work required, just re-inviting people.

### Change the pending-follow-up cutoff day

**Admin → Settings** in the app. No deploy needed — it's a live row in `app_settings`.

---

## 12. Troubleshooting

**"Account not set up yet" for someone who should have access** — check, in order: (1) did
the migrations actually run (`select * from managers;` should return 11 rows), (2) is their
email in `managers.email` (or matches `FOUNDATION_ADMIN_EMAIL`) exactly, (3) is
`managers.status` for them `ACTIVE`.

**401 errors in the browser console / the app is stuck loading for everyone** — Supabase
can't validate the Clerk JWT. Check §3.3/§4.3 (Third-Party Auth) is actually connected on
both sides, and that `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` point at the right project.

**"This record already exists" when a deleted-and-recreated Clerk user signs in** — confirm
migration `0008_reprovision_on_email_conflict.sql` has been applied; it makes re-signup
re-link instead of erroring on the `profiles.email` unique constraint.

**Clerk webhook returns errors, but self-provisioning still works fine** — that's expected
and non-fatal; self-provisioning is the primary mechanism (§1). Check `CLERK_WEBHOOK_SIGNING_SECRET`
is set and you redeployed after adding it (§9.1).

**Google sign-in redirect fails in production only** — see §9.2.

**A SQL migration errors on `generate_series`/`smallint` type mismatches** if you're writing
new ones — Postgres won't implicitly narrow `integer` to `smallint` for function argument
resolution; cast explicitly (see the comments in `0006_dashboard_functions.sql` for a worked
example) and avoid casting `generate_series()`'s arguments directly (ambiguous overload) —
cast the *result* instead.

---

## 13. Security checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET` are set
      only in Vercel's environment variables — never in a `VITE_` var, never committed to git
- [ ] `.env.local` is gitignored (already is — verify with `git status` if unsure)
- [ ] RLS is enabled on every table (it is, by `0003_rls.sql`) — a new table added later
      needs its own policies or it's inaccessible by default, which is the safe failure mode
- [ ] `audit_logs` has no `INSERT`/`UPDATE`/`DELETE` grant for any client role, including
      Admin — only the security-definer trigger writes to it
- [ ] The Clerk webhook endpoint verifies the `svix` signature before touching the database
      (already implemented in `api/webhooks/clerk.ts`) — never disable that check
