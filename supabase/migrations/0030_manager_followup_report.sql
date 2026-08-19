-- Admin Manager-wise Follow-up Report — per-manager follow-up activity
-- breakdown over an arbitrary date range (This Month/Last Month/This Year/
-- Custom Range all resolve to concrete dates client-side before calling
-- this, mirroring donation_engagement_report's p_date_from/p_date_to
-- convention). Deliberately date-range-driven rather than month/year
-- period-driven like is_pending_followup()/admin_overdue_followups() —
-- those encode a single-period business rule (a donation this period also
-- clears "pending") that doesn't generalize to an arbitrary multi-month
-- range, so "pending" here is narrower and simpler: an active assigned
-- member with zero follow-up rows at all in the selected range,
-- independent of donations. Both bounds are inclusive; either may be null
-- for an unbounded side.
create function manager_followup_report(p_date_from date, p_date_to date)
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
  -- Each active member's single most recent follow-up row within the
  -- range (or no row at all) — a clean, mutually-exclusive bucket per
  -- member, so pending+started+in_progress+completed+not_interested+
  -- callback_required+other always sums to assigned_members.
  left join lateral (
    select f.follow_up_status
    from monthly_followups f
    where f.member_id = m.id
      and (p_date_from is null or f.follow_up_date >= p_date_from)
      and (p_date_to is null or f.follow_up_date <= p_date_to)
    order by f.follow_up_date desc, f.created_at desc
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
