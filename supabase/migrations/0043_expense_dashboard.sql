-- Expense Management — Phase 4 (Dashboard)
-- Four read-only aggregate functions feeding the new "Expense Overview"
-- section on the existing Admin Dashboard — same server-side aggregation
-- convention as every other dashboard number in this app (admin_dashboard_stats,
-- member_growth_trend, month_wise_report), so nothing pulls a full expense
-- list client-side to bucket it. All scoped by expense_date (the date an
-- expense pertains to), matching how donation_date already scopes every
-- donation figure — "Pending Approval" and "Approved" are the two
-- exceptions, since those are live queue sizes, not historical counts for
-- a specific month.

create function expense_dashboard_stats(p_month smallint, p_year smallint)
returns table (
  total_expenses_amount numeric,
  total_expenses_count bigint,
  period_expenses_amount numeric,
  period_expenses_count bigint,
  pending_approval_count bigint,
  approved_count bigint,
  period_rejected_count bigint,
  period_cancelled_count bigint,
  total_donations_amount numeric,
  available_balance numeric
) as $$
  select
    (select coalesce(sum(amount_inr), 0) from expenses where status = 'PAID'),
    (select count(*) from expenses where status = 'PAID'),
    (select coalesce(sum(amount_inr), 0) from expenses
      where status = 'PAID' and extract(month from expense_date) = p_month and extract(year from expense_date) = p_year),
    (select count(*) from expenses
      where status = 'PAID' and extract(month from expense_date) = p_month and extract(year from expense_date) = p_year),
    (select count(*) from expenses where status = 'SUBMITTED'),
    (select count(*) from expenses where status = 'APPROVED'),
    (select count(*) from expenses
      where status = 'REJECTED' and extract(month from expense_date) = p_month and extract(year from expense_date) = p_year),
    (select count(*) from expenses
      where status = 'CANCELLED' and extract(month from expense_date) = p_month and extract(year from expense_date) = p_year),
    (select coalesce(sum(amount_inr), 0) from donations where is_deleted = false),
    (select coalesce(sum(balance), 0) from fund_balances_summary())
$$ language sql stable;

create function expense_category_breakdown(p_month smallint, p_year smallint)
returns table (
  category_id uuid,
  category_name text,
  amount numeric,
  expense_count bigint
) as $$
  select c.id, c.name, coalesce(sum(e.amount_inr), 0), count(e.id)
  from expense_categories c
  join expenses e on e.category_id = c.id
    and e.status = 'PAID'
    and extract(month from e.expense_date) = p_month
    and extract(year from e.expense_date) = p_year
  group by c.id, c.name
  order by sum(e.amount_inr) desc
$$ language sql stable;

create function expense_fund_breakdown(p_month smallint, p_year smallint)
returns table (
  fund_id uuid,
  fund_name text,
  amount numeric,
  expense_count bigint
) as $$
  select f.id, f.name, coalesce(sum(e.amount_inr), 0), count(e.id)
  from funds f
  join expenses e on e.fund_id = f.id
    and e.status = 'PAID'
    and extract(month from e.expense_date) = p_month
    and extract(year from e.expense_date) = p_year
  group by f.id, f.name
  order by sum(e.amount_inr) desc
$$ language sql stable;

create function expense_monthly_trend(p_year smallint)
returns table (
  month smallint,
  year smallint,
  amount numeric,
  expense_count bigint
) as $$
  select
    gs.month::smallint,
    p_year,
    (select coalesce(sum(amount_inr), 0) from expenses
      where status = 'PAID' and extract(month from expense_date) = gs.month and extract(year from expense_date) = p_year),
    (select count(*) from expenses
      where status = 'PAID' and extract(month from expense_date) = gs.month and extract(year from expense_date) = p_year)
  from generate_series(1, 12) as gs(month)
  order by gs.month
$$ language sql stable;
