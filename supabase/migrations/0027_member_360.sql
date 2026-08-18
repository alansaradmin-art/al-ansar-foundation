-- Member 360: a planned next follow-up date, and full document/attachment
-- support (new table + a private Supabase Storage bucket).

-- A forward-looking "when should we follow up again" plan, distinct from
-- follow_up_date (when this follow-up actually happened). Optional — most
-- follow-ups (e.g. NOT_INTERESTED) have no next date to plan for.
alter table monthly_followups add column next_follow_up_date date;

-- ── member_documents ──────────────────────────────────────
-- Mirrors donations' soft-delete shape (is_deleted/deleted_at/deleted_by/
-- deletion_reason) exactly, so the same audit-log conventions apply. The
-- actual file bytes live in the 'member-documents' Storage bucket below;
-- this row is only the metadata + pointer (storage_path).
create table member_documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_size bigint not null,
  content_type text not null,
  uploaded_by uuid not null references profiles (id),
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references profiles (id),
  deletion_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_member_documents_member on member_documents (member_id);

-- Default-deny, matching every other table in 0003_rls.sql — this app's
-- browser code never talks to Supabase directly (service-role key only,
-- see api/_lib/auth.ts), so RLS here is defense-in-depth, not the active
-- authorization layer. No policies: nobody can touch this table except the
-- service-role key, which bypasses RLS entirely.
alter table member_documents enable row level security;

-- ── Storage bucket ────────────────────────────────────────
-- Private (public = false): every read goes through a short-lived signed
-- URL minted server-side by api/documents.ts, matching the "service-role
-- key only, nothing client-trusted" rule. 10MB per file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('member-documents', 'member-documents', false, 10485760)
on conflict (id) do nothing;
