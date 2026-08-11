-- Al Ansar Foundation — core schema
-- Tables: profiles, managers, members, donations, monthly_followups, audit_logs, app_settings

create extension if not exists "pgcrypto";

-- ── managers ──────────────────────────────────────────────
create table managers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null unique,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── profiles ──────────────────────────────────────────────
-- One row per Clerk-authenticated user. Role is the source of truth for
-- authorization; Clerk only proves identity, never authorizes access.
create table profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('ADMIN', 'MANAGER')),
  manager_id uuid unique references managers (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint manager_role_requires_manager_id check (
    (role = 'MANAGER' and manager_id is not null) or
    (role = 'ADMIN' and manager_id is null)
  )
);

-- ── members ───────────────────────────────────────────────
create table members (
  id uuid primary key default gen_random_uuid(),
  member_id text not null unique,
  member_name text not null,
  father_name text,
  mobile_number text,
  address text,

  added_by_type text check (added_by_type in ('REGISTERED_MEMBER', 'MANAGER', 'EXTERNAL_CONTACT')),
  added_by_id uuid,
  added_by_name text,
  added_by_phone text,

  reference_contact_type text check (reference_contact_type in ('REGISTERED_MEMBER', 'MANAGER', 'EXTERNAL_CONTACT')),
  reference_contact_id uuid,
  reference_contact_name text,
  reference_contact_phone text,
  reference_contact_relationship text,

  assigned_manager_id uuid references managers (id),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── donations ─────────────────────────────────────────────
-- Every donation is a standalone row. Never overwritten; soft-deleted only,
-- and only by an Admin, with a reason captured for the audit trail.
create table donations (
  id uuid primary key default gen_random_uuid(),
  donation_id text not null unique,
  member_id uuid not null references members (id),
  donation_date date not null,
  donation_month smallint not null check (donation_month between 1 and 12),
  donation_year smallint not null check (donation_year between 2000 and 2100),
  amount_inr numeric(12, 2) not null check (amount_inr > 0),
  payment_method text not null check (payment_method in ('CASH', 'UPI', 'ONLINE', 'BANK_TRANSFER', 'OTHER')),
  transaction_reference text,
  notes text,
  recorded_by uuid not null references profiles (id),
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references profiles (id),
  deletion_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transaction_ref_required_for_non_cash check (
    payment_method not in ('UPI', 'ONLINE', 'BANK_TRANSFER') or
    (transaction_reference is not null and length(trim(transaction_reference)) > 0)
  )
);

-- ── monthly_followups ─────────────────────────────────────
-- Multiple rows per member/month are expected (e.g. NOT_STARTED then later
-- COMPLETED). Pending-follow-up logic only cares whether *any* row for the
-- period has status = COMPLETED.
create table monthly_followups (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members (id),
  manager_id uuid not null references managers (id),
  month smallint not null check (month between 1 and 12),
  year smallint not null check (year between 2000 and 2100),
  follow_up_date date not null,
  follow_up_status text not null check (
    follow_up_status in ('NOT_STARTED', 'COMPLETED', 'NOT_INTERESTED', 'CALLBACK_REQUIRED', 'OTHER')
  ),
  follow_up_method text check (follow_up_method in ('PHONE', 'WHATSAPP', 'IN_PERSON', 'OTHER')),
  contacted_person_type text check (contacted_person_type in ('MEMBER', 'ADDED_BY', 'REFERENCE_CONTACT', 'OTHER')),
  contacted_person_name text,
  contacted_person_phone text,
  contacted_person_relationship text,
  remarks text,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── audit_logs (append-only) ──────────────────────────────
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

-- ── app_settings ───────────────────────────────────────────
-- Business rules that may change without a code deploy (e.g. the
-- pending-follow-up cutoff day).
create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references profiles (id),
  updated_at timestamptz not null default now()
);

-- ── indexes ────────────────────────────────────────────────
create index idx_members_member_id on members (member_id);
create index idx_members_manager on members (assigned_manager_id);
create index idx_members_status on members (status);
create index idx_members_mobile on members (mobile_number);

create index idx_donations_member on donations (member_id);
create index idx_donations_date on donations (donation_date);
create index idx_donations_month_year on donations (donation_month, donation_year);
create index idx_donations_recorded_by on donations (recorded_by);

create index idx_followups_member on monthly_followups (member_id);
create index idx_followups_manager on monthly_followups (manager_id);
create index idx_followups_month_year on monthly_followups (month, year);
create index idx_followups_status on monthly_followups (follow_up_status);

create index idx_profiles_manager on profiles (manager_id);
create index idx_audit_entity on audit_logs (entity_type, entity_id);
