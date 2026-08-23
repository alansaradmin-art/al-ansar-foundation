-- Admin Follow-ups gains the same "In Progress" state the Manager page
-- already got (0031's list_open_followups()) — an admin-facing counterpart
-- returning the same enriched shape as admin_overdue_followups() (member +
-- manager + latest attempt), so its tab reuses the exact same
-- card/table columns as Overdue rather than a bare member row. Unlike
-- list_open_followups(), member_id here is the primary key of the row
-- (one row per member, not a full members record), matching
-- admin_overdue_followups()'s existing shape exactly.

create function admin_open_followups(p_manager_id uuid, p_month smallint, p_year smallint)
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
  order by m.updated_at desc
$$ language sql stable;
