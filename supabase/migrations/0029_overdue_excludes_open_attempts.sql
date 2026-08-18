-- Overdue Follow-ups should mean "nobody has touched this yet" — once a
-- manager has logged a STARTED/IN_PROGRESS attempt (actively being worked)
-- or a COMPLETED one, the member is no longer overdue, even though they may
-- still show as "pending" elsewhere (e.g. the Manager's own Pending tab,
-- which intentionally keeps showing an in-progress attempt so the manager
-- can continue it — see EditFollowupDialog). COMPLETED was already
-- excluded via is_pending_followup(); this adds STARTED/IN_PROGRESS.
-- NOT_INTERESTED/CALLBACK_REQUIRED/OTHER are deliberately left in the
-- overdue list — those outcomes still warrant admin visibility.
--
-- Same argument list and return columns as before (0021), so create or
-- replace is safe here.
create or replace function admin_overdue_followups(p_manager_id uuid, p_month smallint, p_year smallint)
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
    m.id,
    m.member_name,
    m.father_name,
    m.member_id,
    m.assigned_manager_id,
    mg.full_name,
    latest.follow_up_date,
    latest.follow_up_status
  from members m
  left join managers mg on mg.id = m.assigned_manager_id
  left join lateral (
    select f.follow_up_date, f.follow_up_status
    from monthly_followups f
    where f.member_id = m.id and f.month = p_month and f.year = p_year
    order by f.follow_up_date desc
    limit 1
  ) latest on true
  where m.status = 'ACTIVE'
    and (p_manager_id is null or m.assigned_manager_id = p_manager_id)
    and is_pending_followup(m.id, p_month, p_year)
    and (latest.follow_up_status is null or latest.follow_up_status not in ('STARTED', 'IN_PROGRESS', 'COMPLETED'))
  order by m.updated_at desc
$$ language sql stable;
