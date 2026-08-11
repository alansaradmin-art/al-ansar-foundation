-- Aggregation lives in Postgres so dashboards never pull full row sets into
-- the browser to sum/count client-side (requirement: server-side
-- aggregation for dashboard stats). All functions are SECURITY INVOKER
-- (the default) so the caller's own RLS grants still apply underneath —
-- a manager passing another manager's id gets empty scoped results, not a
-- privilege escalation.

create or replace function manager_dashboard_stats(p_manager_id uuid, p_month smallint, p_year smallint)
returns table (
  total_members bigint,
  active_members bigint,
  members_with_donation bigint,
  donation_amount numeric,
  donation_count bigint,
  completed_followups bigint,
  pending_followups bigint
) as $$
  with scoped_members as (
    select id, status from members where assigned_manager_id = p_manager_id
  ),
  period_donations as (
    select d.member_id, d.amount_inr
    from donations d
    join scoped_members m on m.id = d.member_id
    where d.donation_month = p_month and d.donation_year = p_year and not d.is_deleted
  ),
  period_followups as (
    select f.member_id, f.follow_up_status
    from monthly_followups f
    join scoped_members m on m.id = f.member_id
    where f.month = p_month and f.year = p_year
  )
  select
    (select count(*) from scoped_members),
    (select count(*) from scoped_members where status = 'ACTIVE'),
    (select count(distinct member_id) from period_donations),
    coalesce((select sum(amount_inr) from period_donations), 0),
    (select count(*) from period_donations),
    (select count(distinct member_id) from period_followups where follow_up_status = 'COMPLETED'),
    (select count(*) from scoped_members sm where sm.status = 'ACTIVE' and is_pending_followup(sm.id, p_month, p_year))
$$ language sql stable;

create or replace function admin_dashboard_stats(p_month smallint, p_year smallint)
returns table (
  total_members bigint,
  active_members bigint,
  inactive_members bigint,
  total_managers bigint,
  total_donations bigint,
  total_donation_amount numeric,
  period_donation_amount numeric,
  period_donation_count bigint,
  completed_followups bigint,
  pending_followups bigint
) as $$
  select
    (select count(*) from members),
    (select count(*) from members where status = 'ACTIVE'),
    (select count(*) from members where status = 'INACTIVE'),
    (select count(*) from managers where status = 'ACTIVE'),
    (select count(*) from donations where not is_deleted),
    coalesce((select sum(amount_inr) from donations where not is_deleted), 0),
    coalesce((select sum(amount_inr) from donations where not is_deleted and donation_month = p_month and donation_year = p_year), 0),
    (select count(*) from donations where not is_deleted and donation_month = p_month and donation_year = p_year),
    (select count(distinct member_id) from monthly_followups where month = p_month and year = p_year and follow_up_status = 'COMPLETED'),
    (select count(*) from members m where m.status = 'ACTIVE' and is_pending_followup(m.id, p_month, p_year))
$$ language sql stable;

create or replace function manager_wise_report(p_month smallint, p_year smallint)
returns table (
  manager_id uuid,
  manager_name text,
  assigned_members bigint,
  members_with_donation bigint,
  donation_count bigint,
  donation_amount numeric,
  completed_followups bigint,
  pending_followups bigint
) as $$
  select
    mg.id,
    mg.full_name,
    count(distinct mm.id) filter (where mm.id is not null),
    count(distinct d.member_id) filter (where d.id is not null),
    count(d.id),
    coalesce(sum(d.amount_inr), 0),
    count(distinct f.member_id) filter (where f.follow_up_status = 'COMPLETED'),
    count(distinct mm.id) filter (
      where mm.status = 'ACTIVE' and is_pending_followup(mm.id, p_month, p_year)
    )
  from managers mg
  left join members mm on mm.assigned_manager_id = mg.id
  left join donations d
    on d.member_id = mm.id and not d.is_deleted
    and d.donation_month = p_month and d.donation_year = p_year
  left join monthly_followups f
    on f.member_id = mm.id and f.month = p_month and f.year = p_year
  group by mg.id, mg.full_name
  order by mg.full_name
$$ language sql stable;

create or replace function month_wise_report(p_year smallint)
returns table (
  month smallint,
  year smallint,
  donation_count bigint,
  donation_amount numeric,
  completed_followups bigint,
  pending_followups bigint
) as $$
  select
    gs.month::smallint,
    p_year,
    (select count(*) from donations d where not d.is_deleted and d.donation_month = gs.month and d.donation_year = p_year),
    coalesce((select sum(d.amount_inr) from donations d where not d.is_deleted and d.donation_month = gs.month and d.donation_year = p_year), 0),
    (select count(distinct f.member_id) from monthly_followups f where f.month = gs.month and f.year = p_year and f.follow_up_status = 'COMPLETED'),
    (select count(*) from members m where m.status = 'ACTIVE' and is_pending_followup(m.id, gs.month::smallint, p_year))
  from generate_series(1, 12) as gs(month)
  order by gs.month
$$ language sql stable;

-- Full member rows (with contact info) for the Pending Follow-ups screen.
-- p_manager_id = null means "all managers" (Admin view).
create or replace function list_pending_followups(p_manager_id uuid, p_month smallint, p_year smallint)
returns setof members as $$
  select m.*
  from members m
  where m.status = 'ACTIVE'
    and (p_manager_id is null or m.assigned_manager_id = p_manager_id)
    and is_pending_followup(m.id, p_month, p_year)
  order by m.member_name
$$ language sql stable;
