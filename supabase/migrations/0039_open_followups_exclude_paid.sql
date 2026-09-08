-- A member who's already paid this period should never show up as needing
-- further follow-up, even if their most recent monthly_followups row is
-- still nominally STARTED/IN_PROGRESS/CALLBACK_REQUIRED (e.g. because it
-- predates the donation-triggered auto-close logic, or that logic only
-- ever handled a subset of open statuses/periods until now). Adds the
-- same donation-exists condition is_pending_followup() already uses for
-- its own donation check, so "has this member paid" is validated against
-- the real donations table on every read rather than trusted from
-- whatever the follow-up row's own status happens to say.
--
-- Same signature/return shape as the existing 0031/0032 definitions, so
-- every caller (useOpenFollowups, useAdminOpenFollowups, the Dashboard's
-- "In Progress Follow-ups" tile) picks this up with no code changes.

create or replace function list_open_followups(p_manager_id uuid, p_month smallint, p_year smallint)
returns setof members as $$
  select m.*
  from members m
  join lateral (
    select f.follow_up_status
    from monthly_followups f
    where f.member_id = m.id and f.month = p_month and f.year = p_year
    order by f.follow_up_date desc, f.created_at desc
    limit 1
  ) latest on true
  where m.status = 'ACTIVE'
    and (p_manager_id is null or m.assigned_manager_id = p_manager_id)
    and latest.follow_up_status in ('STARTED', 'IN_PROGRESS', 'CALLBACK_REQUIRED')
    and not exists (
      select 1 from donations d
      where d.member_id = m.id and d.donation_month = p_month
        and d.donation_year = p_year and not d.is_deleted
    )
  order by m.updated_at desc
$$ language sql stable;

create or replace function admin_open_followups(p_manager_id uuid, p_month smallint, p_year smallint)
returns table (
  member_id uuid,
  member_name text,
  father_name text,
  member_display_id text,
  assigned_manager_id uuid,
  manager_name text,
  last_follow_up_date date,
  last_follow_up_status text
) as $$
  select
    m.id, m.member_name, m.father_name, m.member_id, m.assigned_manager_id, mg.full_name,
    latest.follow_up_date, latest.follow_up_status
  from members m
  left join managers mg on mg.id = m.assigned_manager_id
  join lateral (
    select f.follow_up_date, f.follow_up_status
    from monthly_followups f
    where f.member_id = m.id and f.month = p_month and f.year = p_year
    order by f.follow_up_date desc, f.created_at desc
    limit 1
  ) latest on true
  where m.status = 'ACTIVE'
    and (p_manager_id is null or m.assigned_manager_id = p_manager_id)
    and latest.follow_up_status in ('STARTED', 'IN_PROGRESS', 'CALLBACK_REQUIRED')
    and not exists (
      select 1 from donations d
      where d.member_id = m.id and d.donation_month = p_month
        and d.donation_year = p_year and not d.is_deleted
    )
  order by m.updated_at desc
$$ language sql stable;
