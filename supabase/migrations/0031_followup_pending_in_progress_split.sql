-- Splits the Manager Follow-ups "Pending" tab into two states: Pending
-- (never touched this period) and In Progress (an open attempt already
-- exists: STARTED/IN_PROGRESS/CALLBACK_REQUIRED). Previously
-- list_pending_followups() returned both — "no COMPLETED follow-up yet"
-- also matched an already-started attempt, which is why EditFollowupDialog
-- exists (continuing it from Member 360's Follow-ups tab). Now each state
-- gets its own tab and its own query.

-- Pending narrows to "no follow-up record at all this period" on top of
-- the existing due-date/donation gate — same signature/return type as
-- before, so create or replace is safe; the only caller is
-- api/followups.ts's ?action=pending (Manager's Pending tab).
create or replace function list_pending_followups(p_manager_id uuid, p_month smallint, p_year smallint)
returns setof members as $$
  select m.*
  from members m
  where m.status = 'ACTIVE'
    and (p_manager_id is null or m.assigned_manager_id = p_manager_id)
    and is_pending_followup(m.id, p_month, p_year)
    and not exists (
      select 1 from monthly_followups f
      where f.member_id = m.id and f.month = p_month and f.year = p_year
    )
  order by m.updated_at desc
$$ language sql stable;

-- In Progress: the member's most recent follow-up row this period
-- (by follow_up_date, then created_at as tiebreak — matching the order
-- api/followups.ts's ?action=forMember already returns, so the frontend's
-- "first row" always agrees with what put the member in this list) has an
-- open status. Deliberately NOT gated by is_pending_followup()'s
-- cutoff-day/donation rules — an already-started attempt should be seen
-- through to a final outcome regardless of when in the month it happened
-- or whether a donation later arrived.
create function list_open_followups(p_manager_id uuid, p_month smallint, p_year smallint)
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
  order by m.updated_at desc
$$ language sql stable;
