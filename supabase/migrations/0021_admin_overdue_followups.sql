-- Admin Dashboard "Needs Attention" — Overdue Follow-ups. Unlike
-- list_pending_followups() (returns bare member rows, used by the
-- Manager Pending tab — left untouched, other UI depends on its exact
-- shape), this also surfaces each pending member's most recent
-- follow-up attempt this period (date + status), or null if none was
-- ever logged. Reuses is_pending_followup() rather than re-deriving the
-- pending predicate.

create function admin_overdue_followups(p_manager_id uuid, p_month smallint, p_year smallint)
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
  order by m.updated_at desc
$$ language sql stable;
