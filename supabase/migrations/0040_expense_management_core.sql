-- Expense Management — Phase 1 (Expense Core)
-- New, standalone module: money the Foundation spends, never stored as a
-- negative donation. Six new tables; nothing existing is altered. Approval
-- workflow, recurring authorizations, and the funds<->donations bridge are
-- deliberately NOT part of this migration — see the Expense Management Plan
-- artifact for the full phased design. Phase 1 status is intentionally just
-- DRAFT/PAID/CANCELLED (no approval states yet); every expense endpoint is
-- Admin-only until Phase 2 introduces the Treasurer grant.

-- ── funds ─────────────────────────────────────────────────
create table funds (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seeded to mirror donations.donation_type's existing four values exactly,
-- so a future fund_id bridge on donations (a later, separate migration) is
-- a straightforward code match, not new data entry.
insert into funds (code, name, sort_order) values
  ('GENERAL', 'General Fund', 0),
  ('ZAKAT', 'Zakat Fund', 1),
  ('SADAQAH', 'Sadaqah Fund', 2),
  ('FITRA', 'Fitrah Fund', 3),
  ('RAMADAN', 'Ramadan Fund', 4),
  ('MEDICAL', 'Medical Assistance Fund', 5),
  ('EDUCATION', 'Education Fund', 6),
  ('OTHER', 'Other', 99)
on conflict (code) do nothing;

-- ── expense_categories ────────────────────────────────────
-- Independent of fund by design — the same category can be paid from more
-- than one fund across different expenses.
create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  group_label text,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into expense_categories (name, group_label, sort_order) values
  ('Charity / Financial Assistance', 'Program', 0),
  ('Medical Assistance', 'Program', 1),
  ('Food / Ration Distribution', 'Program', 2),
  ('Education Assistance', 'Program', 3),
  ('Emergency Assistance', 'Program', 4),
  ('Family Support', 'Program', 5),
  ('Funeral Assistance', 'Program', 6),
  ('Deeniyat / Classes', 'Program', 7),
  ('Ramadan Programs', 'Program', 8),
  ('Ambulance Activities', 'Program', 9),
  ('Medical / Pharmacy Activities', 'Program', 10),
  ('Events', 'Program', 11),
  ('Office Expenses', 'Operational', 12),
  ('Rent', 'Operational', 13),
  ('Utilities', 'Operational', 14),
  ('Internet / Phone', 'Operational', 15),
  ('Software / Subscriptions', 'Operational', 16),
  ('Printing / Stationery', 'Operational', 17),
  ('Transportation', 'Operational', 18),
  ('Bank Charges', 'Operational', 19),
  ('Other Operational Expenses', 'Operational', 20)
on conflict (name) do nothing;

-- ── payment_methods ───────────────────────────────────────
-- Deliberately not shared with donations.payment_method (a hard-coded check
-- constraint there, unchanged) — the Foundation may pay a vendor by cheque
-- without ever accepting cheque donations, and §8 of the plan asks for this
-- one to be admin-configurable rather than fixed in code.
create table payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  requires_reference boolean not null default false,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into payment_methods (name, requires_reference, sort_order) values
  ('Cash', false, 0),
  ('Bank Transfer', true, 1),
  ('Cheque', true, 2),
  ('Online Transfer', true, 3),
  ('Other', false, 4)
on conflict (name) do nothing;

-- ── beneficiaries ─────────────────────────────────────────
-- Deliberately separate from members — a member contributes, a beneficiary
-- receives. The two sets overlap sometimes (member_id, optional) but are
-- never forced to be the same list.
create table beneficiaries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members (id),
  display_name text,
  phone text,
  address text,
  is_confidential boolean not null default false,
  notes text,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint confidential_beneficiary_has_no_identity check (
    not is_confidential or (display_name is null and phone is null and member_id is null)
  ),
  constraint non_confidential_beneficiary_has_a_name check (
    is_confidential or display_name is not null
  )
);

-- ── expenses ──────────────────────────────────────────────
-- Every expense is a standalone row, same shape philosophy as donations:
-- never overwritten once paid, cancelled rather than deleted, with a
-- reason captured for the audit trail.
create table expenses (
  id uuid primary key default gen_random_uuid(),
  expense_number text not null unique,
  expense_date date not null,
  amount_inr numeric(12, 2) not null check (amount_inr > 0),
  fund_id uuid not null references funds (id),
  category_id uuid not null references expense_categories (id),
  beneficiary_id uuid references beneficiaries (id),
  paid_to text,
  payment_method_id uuid references payment_methods (id),
  transaction_reference text,
  purpose text not null,
  description text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PAID', 'CANCELLED')),
  created_by uuid not null references profiles (id),
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references profiles (id),
  cancellation_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Server-generated, human-readable expense numbers (EXP000001, ...) — same
-- sequence+trigger mechanism as donation_id (0005_donation_id_sequence.sql).
create sequence expense_number_seq start 1;

create or replace function generate_expense_number()
returns trigger as $$
begin
  if new.expense_number is null or new.expense_number = '' then
    new.expense_number := 'EXP' || lpad(nextval('expense_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_generate_expense_number before insert on expenses
  for each row execute function generate_expense_number();

-- ── expense_attachments ───────────────────────────────────
-- Mirrors member_documents' shape exactly (0027_member_360.sql) — same
-- soft-delete columns, same "row is metadata + pointer only, bytes live in
-- Storage" split, same private-bucket-plus-signed-URL access pattern.
create table expense_attachments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses (id) on delete cascade,
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

insert into storage.buckets (id, name, public, file_size_limit)
values ('expense-attachments', 'expense-attachments', false, 10485760)
on conflict (id) do nothing;

-- ── indexes ────────────────────────────────────────────────
create index idx_expenses_fund on expenses (fund_id);
create index idx_expenses_category on expenses (category_id);
create index idx_expenses_status on expenses (status);
create index idx_expenses_date on expenses (expense_date);
create index idx_expenses_fund_date on expenses (fund_id, expense_date);
create index idx_expenses_beneficiary on expenses (beneficiary_id);
create index idx_expenses_created_by on expenses (created_by);

create index idx_beneficiaries_member on beneficiaries (member_id);
create index idx_expense_attachments_expense on expense_attachments (expense_id);

-- ── RLS ────────────────────────────────────────────────────
-- Default-deny, matching every table this app has added since 0003_rls.sql
-- (see member_documents in 0027_member_360.sql): the browser never talks to
-- Supabase directly, so RLS here is defense-in-depth, not the active
-- authorization layer. No policies: only the service-role key can touch
-- these tables, and it bypasses RLS entirely.
alter table funds enable row level security;
alter table expense_categories enable row level security;
alter table payment_methods enable row level security;
alter table beneficiaries enable row level security;
alter table expenses enable row level security;
alter table expense_attachments enable row level security;
