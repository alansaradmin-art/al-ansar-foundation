-- Admin Dashboard enhancement: optional donation_type filter on the two
-- existing report aggregates, plus a new combined "members needing
-- attention" view (pending follow-up / inactive / no recent donation in
-- one bounded, sorted query so the dashboard never has to pull the full
-- member list client-side to compute this).

create or replace function manager_wise_report(p_month smallint, p_year smallint, p_donation_type text default null)
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
    and (p_donation_type is null or d.donation_type = p_donation_type)
  left join monthly_followups f
    on f.member_id = mm.id and f.month = p_month and f.year = p_year
  group by mg.id, mg.full_name
  order by mg.full_name
$$ language sql stable;

create or replace function month_wise_report(p_year smallint, p_donation_type text default null)
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
    (select count(*) from donations d where not d.is_deleted and d.donation_month = gs.month and d.donation_year = p_year
      and (p_donation_type is null or d.donation_type = p_donation_type)),
    coalesce((select sum(d.amount_inr) from donations d where not d.is_deleted and d.donation_month = gs.month and d.donation_year = p_year
      and (p_donation_type is null or d.donation_type = p_donation_type)), 0),
    (select count(distinct f.member_id) from monthly_followups f where f.month = gs.month and f.year = p_year and f.follow_up_status = 'COMPLETED'),
    (select count(*) from members m where m.status = 'ACTIVE' and is_pending_followup(m.id, gs.month::smallint, p_year))
  from generate_series(1, 12) as gs(month)
  order by gs.month
$$ language sql stable;

-- Combined attention list for the Admin Dashboard. A member can match more
-- than one reason (e.g. active, pending follow-up, and no recent donation
-- all at once) except is_inactive, which is mutually exclusive with the
-- other two by construction (both require status = 'ACTIVE'). "No recent
-- donation" = no non-deleted donation in the trailing 3-month window
-- ending at the selected period (the period itself plus the two months
-- before it), keyed off the existing (donation_month, donation_year)
-- columns/index rather than donation_date.
create or replace function members_needing_attention(p_manager_id uuid, p_month smallint, p_year smallint, p_limit integer default 500)
returns table (
  id uuid,
  member_id text,
  member_name text,
  father_name text,
  mobile_number text,
  assigned_manager_id uuid,
  manager_name text,
  status text,
  updated_at timestamptz,
  is_pending_followup boolean,
  is_inactive boolean,
  no_recent_donation boolean
) as $$
  select
    m.id, m.member_id, m.member_name, m.father_name, m.mobile_number, m.assigned_manager_id, mg.full_name,
    m.status, m.updated_at,
    (m.status = 'ACTIVE' and is_pending_followup(m.id, p_month, p_year)),
    (m.status = 'INACTIVE'),
    (m.status = 'ACTIVE' and not exists (
      select 1 from donations d
      where d.member_id = m.id and not d.is_deleted
        and (d.donation_year::int * 12 + d.donation_month::int)
            between (p_year::int * 12 + p_month::int - 2) and (p_year::int * 12 + p_month::int)
    ))
  from members m
  left join managers mg on mg.id = m.assigned_manager_id
  where (p_manager_id is null or m.assigned_manager_id = p_manager_id)
    and (
      (m.status = 'ACTIVE' and is_pending_followup(m.id, p_month, p_year))
      or m.status = 'INACTIVE'
      or (m.status = 'ACTIVE' and not exists (
        select 1 from donations d
        where d.member_id = m.id and not d.is_deleted
          and (d.donation_year::int * 12 + d.donation_month::int)
              between (p_year::int * 12 + p_month::int - 2) and (p_year::int * 12 + p_month::int)
      ))
    )
  order by m.updated_at desc
  limit p_limit
$$ language sql stable;
