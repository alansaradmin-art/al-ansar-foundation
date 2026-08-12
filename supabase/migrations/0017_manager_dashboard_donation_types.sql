-- Manager Dashboard: add a per-period donation-type breakdown (Zakat /
-- Sadaqah-Sadka / Fitra / General & Other) so a Manager can see the same
-- kind of type split Admin already gets in the Monthly Donation Report,
-- scoped to their own members only.
--
-- This changes manager_dashboard_stats()'s RETURN TABLE column list with
-- the same argument list, which `create or replace function` cannot do
-- ("cannot change return type of existing function") — drop and recreate
-- instead. Nothing else in the schema references this function, so the
-- drop is safe.

drop function if exists manager_dashboard_stats(uuid, smallint, smallint);

create function manager_dashboard_stats(p_manager_id uuid, p_month smallint, p_year smallint)
returns table (
  total_members bigint,
  active_members bigint,
  members_with_donation bigint,
  donation_amount numeric,
  donation_count bigint,
  completed_followups bigint,
  pending_followups bigint,
  zakat_amount numeric,
  sadaqah_amount numeric,
  fitra_amount numeric,
  general_or_other_amount numeric
) as $$
  with scoped_members as (
    select id, status from members where assigned_manager_id = p_manager_id
  ),
  period_donations as (
    select d.member_id, d.amount_inr, d.donation_type
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
    (select count(*) from scoped_members sm where sm.status = 'ACTIVE' and is_pending_followup(sm.id, p_month, p_year)),
    coalesce((select sum(amount_inr) from period_donations where donation_type = 'ZAKAT'), 0),
    coalesce((select sum(amount_inr) from period_donations where donation_type = 'SADAQAH'), 0),
    coalesce((select sum(amount_inr) from period_donations where donation_type = 'FITRA'), 0),
    coalesce((select sum(amount_inr) from period_donations where donation_type in ('GENERAL', 'OTHER')), 0)
$$ language sql stable;
