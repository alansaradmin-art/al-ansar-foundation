-- manager_followup_report() already gave each member exactly one bucket
-- (never double-counted across their follow-up rows), but picked that
-- bucket by "most recent follow_up_date in range" — a member who had an
-- early In Progress attempt later followed by a Completed note that same
-- month landed in completed_count, hiding that they'd ever needed
-- attention. Reporting wants the opposite lens from the Follow-ups tabs'
-- "what's true right now": if the member had ANY open thread this month,
-- that's the operationally relevant signal regardless of what came after.
--
-- New priority, highest wins regardless of date: IN_PROGRESS >
-- CALLBACK_REQUIRED > COMPLETED > NOT_INTERESTED > STARTED. Pending is
-- unaffected — it only ever applies when a member has zero rows in range,
-- so it never competes with an actual status. COMPLETED is ranked above
-- NOT_INTERESTED (not specified by the request that prompted this
-- migration; the two only tie when a member has both in the same range,
-- an edge case — a completed donation is treated as the more relevant
-- signal to surface than an earlier "not interested" note that turned
-- out not to be final).
--
-- Same argument list and return columns as 0030, so create or replace is
-- safe.
create or replace function manager_followup_report(p_date_from date, p_date_to date)
returns table (
  manager_id uuid,
  manager_name text,
  assigned_members integer,
  pending_count integer,
  started_count integer,
  in_progress_count integer,
  completed_count integer,
  not_interested_count integer,
  callback_required_count integer,
  other_count integer,
  total_followups integer
) as $$
  select
    mg.id,
    mg.full_name,
    count(distinct m.id),
    count(distinct m.id) filter (where latest.follow_up_status is null),
    count(distinct m.id) filter (where latest.follow_up_status = 'STARTED'),
    count(distinct m.id) filter (where latest.follow_up_status = 'IN_PROGRESS'),
    count(distinct m.id) filter (where latest.follow_up_status = 'COMPLETED'),
    count(distinct m.id) filter (where latest.follow_up_status = 'NOT_INTERESTED'),
    count(distinct m.id) filter (where latest.follow_up_status = 'CALLBACK_REQUIRED'),
    count(distinct m.id) filter (where latest.follow_up_status = 'OTHER'),
    coalesce(sum(totals.cnt), 0)
  from managers mg
  left join members m on m.assigned_manager_id = mg.id and m.status = 'ACTIVE'
  -- Each active member's single highest-priority follow-up status within
  -- the range (or no row at all) — still a clean, mutually-exclusive
  -- bucket per member, so pending+started+in_progress+completed+
  -- not_interested+callback_required+other always sums to assigned_members.
  left join lateral (
    select f.follow_up_status
    from monthly_followups f
    where f.member_id = m.id
      and (p_date_from is null or f.follow_up_date >= p_date_from)
      and (p_date_to is null or f.follow_up_date <= p_date_to)
    order by
      case f.follow_up_status
        when 'IN_PROGRESS' then 1
        when 'CALLBACK_REQUIRED' then 2
        when 'COMPLETED' then 3
        when 'NOT_INTERESTED' then 4
        when 'STARTED' then 5
        else 6
      end,
      f.follow_up_date desc,
      f.created_at desc
    limit 1
  ) latest on m.id is not null
  -- Total follow-up rows in range per member, summed at the manager level
  -- below — raw activity volume, distinct from the per-member status
  -- buckets above (a member can have multiple attempts in one range).
  left join lateral (
    select count(*) as cnt
    from monthly_followups f
    where f.member_id = m.id
      and (p_date_from is null or f.follow_up_date >= p_date_from)
      and (p_date_to is null or f.follow_up_date <= p_date_to)
  ) totals on m.id is not null
  where mg.status = 'ACTIVE'
  group by mg.id, mg.full_name
  order by mg.full_name
$$ language sql stable;
