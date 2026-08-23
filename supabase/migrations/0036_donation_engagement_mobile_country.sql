-- Add mobile_country to the Donation Engagement Report, alongside the
-- mobile_number it already returns (0020), so its phone display/export
-- use the same deterministic country lookup as everywhere else post-0035
-- instead of falling back to the legacy guess for every row. Changes the
-- function's return column list with the same argument list, which
-- `create or replace function` cannot do — drop and recreate instead
-- (same reasoning as 0020 itself).

drop function if exists donation_engagement_report(date, date, boolean);

create function donation_engagement_report(p_date_from date, p_date_to date, p_never_donated boolean default false)
returns table (
  member_id uuid,
  member_name text,
  father_name text,
  mobile_number text,
  mobile_country text,
  member_display_id text,
  assigned_manager_id uuid,
  manager_name text,
  donated boolean,
  donation_count bigint,
  total_amount numeric,
  latest_donation_date date
) as $$
  select
    m.id,
    m.member_name,
    m.father_name,
    m.mobile_number,
    m.mobile_country,
    m.member_id,
    m.assigned_manager_id,
    mg.full_name,
    coalesce(period_stats.cnt, 0) > 0,
    coalesce(period_stats.cnt, 0),
    coalesce(period_stats.total, 0),
    all_time.latest
  from members m
  left join managers mg on mg.id = m.assigned_manager_id
  left join lateral (
    select count(*) as cnt, sum(d.amount_inr) as total
    from donations d
    where d.member_id = m.id and not d.is_deleted
      and (p_date_from is null or d.donation_date >= p_date_from)
      and (p_date_to is null or d.donation_date <= p_date_to)
  ) period_stats on true
  left join lateral (
    select max(d.donation_date) as latest, count(*) as ever_cnt
    from donations d where d.member_id = m.id and not d.is_deleted
  ) all_time on true
  where m.status = 'ACTIVE'
    and (not p_never_donated or all_time.ever_cnt = 0)
  order by m.member_name
$$ language sql stable;
