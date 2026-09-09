-- Expense Management — Phase 2 (Approval Workflow)
-- Adds: profile_financial_roles (stackable grants — a Manager can also be
-- Treasurer, per the explicit correction in the Expense Management Plan
-- artifact §E), full committee-quorum approval (every required role must
-- sign, not just one authorized approver — the user's explicit choice over
-- the single-approver default this plan originally recommended), and the
-- expense_approvals per-signer ledger. Widens expenses.status; nothing
-- else about Phase 1's tables changes shape, and donations/members/etc.
-- are untouched.

-- ── profile_financial_roles ───────────────────────────────
-- Many-to-many: a profile can hold zero or more of these at once, on top
-- of their unchanged base profiles.role (ADMIN/MANAGER). Soft-revoked,
-- never deleted, so grant history survives.
create table profile_financial_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id),
  role_code text not null check (
    role_code in ('TREASURER', 'VICE_TREASURER', 'PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'GENERAL_SECRETARY')
  ),
  granted_by uuid not null references profiles (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references profiles (id)
);

-- One active grant of a given role per person at a time; re-granting after
-- a revoke is a fresh row, so the full history stays queryable.
create unique index idx_profile_financial_roles_active
  on profile_financial_roles (profile_id, role_code)
  where revoked_at is null;

create index idx_profile_financial_roles_profile on profile_financial_roles (profile_id);

alter table profile_financial_roles enable row level security;

-- ── expenses: widen the status machine ────────────────────
-- Phase 1 shipped DRAFT/PAID/CANCELLED only (no approval gate). This adds
-- the real workflow: DRAFT -> SUBMITTED -> (APPROVED | REJECTED) -> PAID,
-- with CANCELLED reachable as an exception from any non-terminal state
-- (unchanged from Phase 1's rule).
alter table expenses drop constraint if exists expenses_status_check;
alter table expenses add constraint expenses_status_check
  check (status in ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'));

alter table expenses add column submitted_at timestamptz;
-- Snapshotted from app_settings.EXPENSE_APPROVAL_QUORUM_ROLES at the
-- moment of submission, not read live at approval time — so a later
-- change to the committee's required roles never moves the goalposts on
-- an expense that's already mid-approval.
alter table expenses add column required_approval_roles text[];
alter table expenses add column approved_at timestamptz;
alter table expenses add column rejected_at timestamptz;
alter table expenses add column rejected_by uuid references profiles (id);
alter table expenses add column rejected_reason text;
-- Bumped on every resubmission after a rejection, so a fresh approval
-- cycle's signatures never collide with the previous (rejected) cycle's
-- rows in expense_approvals — see idx_expense_approvals_active below.
alter table expenses add column approval_cycle smallint not null default 1;

-- ── expense_approvals (per-signer ledger) ─────────────────
-- One row per person who actually signed, not per expense — this is what
-- makes quorum ("every required role must sign") representable at all,
-- versus Phase 1's single approved_by column.
create table expense_approvals (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses (id),
  approval_cycle smallint not null,
  -- Null only for an Admin override row (is_override = true) — every
  -- normal signature fulfills one specific required role slot.
  role_code text check (
    role_code is null or
    role_code in ('TREASURER', 'VICE_TREASURER', 'PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'GENERAL_SECRETARY')
  ),
  signer_id uuid not null references profiles (id),
  action text not null check (action in ('APPROVE', 'REJECT')),
  is_override boolean not null default false,
  comment text,
  created_at timestamptz not null default now(),
  -- An override row always has a null role_code (it doesn't fill any one
  -- committee slot); every other signature always has a real one — the
  -- two facts are equivalent, so one constraint captures both directions.
  constraint override_iff_no_role_slot check (is_override = (role_code is null))
);

-- One signature per required-role slot per cycle — prevents the same role
-- being signed twice in one approval cycle. Override rows are exempt (a
-- role_code of null never collides).
create unique index idx_expense_approvals_active
  on expense_approvals (expense_id, approval_cycle, role_code)
  where role_code is not null and not is_override;

create index idx_expense_approvals_expense on expense_approvals (expense_id);

alter table expense_approvals enable row level security;

-- Self-approval blocked at the database level, not just the API — cannot
-- be expressed as a plain check constraint (it needs to look up a
-- different table), so it's a trigger instead. Applies to every signature
-- including an Admin override: the "two-person rule" risk flagged in the
-- plan (§M) is exactly the case where the only available Admin is also
-- the expense's own creator — the fix there is a second named approver,
-- never a self-override exception.
create or replace function prevent_expense_self_approval()
returns trigger as $$
declare
  v_created_by uuid;
begin
  select created_by into v_created_by from expenses where id = new.expense_id;
  if v_created_by = new.signer_id then
    raise exception 'A caller cannot sign off on an expense they created themselves.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_prevent_expense_self_approval before insert on expense_approvals
  for each row execute function prevent_expense_self_approval();

-- ── app_settings ───────────────────────────────────────────
-- The committee, for quorum purposes: every one of these role_codes must
-- have at least one signature before an expense counts as Approved.
-- Seeded to just Treasurer (quorum of one) so the module stays usable the
-- moment this migration runs, before an Admin has necessarily granted any
-- other financial role yet — expand via Settings once the real committee
-- roster is set up.
insert into app_settings (key, value) values
  ('EXPENSE_APPROVAL_QUORUM_ROLES', '["TREASURER"]')
on conflict (key) do nothing;
