-- Expense Management — Phase 3 (Funds & Donation Bridge)
-- Connects the existing, untouched donations table to the new funds table,
-- and adds the fund-balance calculation itself. Per the Expense Management
-- Plan artifact §B/§G: additive and backward-compatible only — no existing
-- donation column, constraint, row shape, API payload, or UI is touched.
-- The bridge is maintained entirely by a trigger, not application code, so
-- api/donations.ts and everything downstream of it stays exactly as it was.

-- ── donations.fund_id ──────────────────────────────────────
-- Nullable, additive. donations.donation_type already fully determines
-- which fund a donation belongs to (both use the identical five values:
-- ZAKAT/SADAQAH/FITRA/GENERAL/OTHER — funds seeded in 0040 to match), so
-- this is a derived column kept in sync automatically rather than a new
-- field anyone has to fill in.
alter table donations add column fund_id uuid references funds (id);
create index idx_donations_fund on donations (fund_id);

create or replace function sync_donation_fund_id()
returns trigger as $$
begin
  select id into new.fund_id from funds where code = new.donation_type;
  return new;
end;
$$ language plpgsql;

-- Fires on every insert, and on every update that changes donation_type
-- (e.g. an Admin correcting a miscategorized donation via
-- EditDonationDialog) — fund_id can never silently drift out of sync with
-- donation_type without any application code needing to know this bridge
-- exists at all.
create trigger trg_sync_donation_fund_id before insert or update of donation_type on donations
  for each row execute function sync_donation_fund_id();

-- Backfill every existing donation the same way — a read-derived
-- population from data that already fully determines it, not a change to
-- what any existing donation means.
update donations d set fund_id = f.id from funds f where f.code = d.donation_type and d.fund_id is null;

-- ── fund balance ───────────────────────────────────────────
-- Computed live from the transaction tables on every call, matching this
-- app's existing convention for every dashboard number (manager_dashboard_stats(),
-- is_pending_followup(), etc.) — no stored running balance to drift out of
-- sync with its own transactions. Only PAID expenses reduce a fund's
-- balance; an Approved-but-unpaid expense is a commitment, not yet a cash
-- movement.
create or replace function fund_balance(p_fund_id uuid, p_as_of date default current_date)
returns numeric as $$
  select
    coalesce((
      select sum(d.amount_inr) from donations d
      where d.fund_id = p_fund_id and d.is_deleted = false and d.donation_date <= p_as_of
    ), 0)
    - coalesce((
      select sum(e.amount_inr) from expenses e
      where e.fund_id = p_fund_id and e.status = 'PAID' and e.expense_date <= p_as_of
    ), 0)
$$ language sql stable;

-- One round trip for every active fund's balance at once — the data
-- source for the Expenses page's fund-balance strip (Phase 3) and, later,
-- the Fund Report (Phase 5).
create or replace function fund_balances_summary(p_as_of date default current_date)
returns table (
  fund_id uuid,
  fund_code text,
  fund_name text,
  donations_total numeric,
  expenses_total numeric,
  balance numeric
) as $$
  select
    f.id,
    f.code,
    f.name,
    coalesce(d.total, 0),
    coalesce(e.total, 0),
    coalesce(d.total, 0) - coalesce(e.total, 0)
  from funds f
  left join lateral (
    select sum(amount_inr) as total from donations
    where fund_id = f.id and is_deleted = false and donation_date <= p_as_of
  ) d on true
  left join lateral (
    select sum(amount_inr) as total from expenses
    where fund_id = f.id and status = 'PAID' and expense_date <= p_as_of
  ) e on true
  where f.is_active
  order by f.sort_order
$$ language sql stable;
