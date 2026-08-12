-- Default member listings now show most-recently-updated first, everywhere
-- else in the app (api/members.ts). Pending Follow-ups is member data too,
-- driven by this SQL function rather than a query in api/*.ts, so it needs
-- the same reordering — a pure create-or-replace, identical body to
-- 0006_dashboard_functions.sql except the order by clause.

create or replace function list_pending_followups(p_manager_id uuid, p_month smallint, p_year smallint)
returns setof members as $$
  select m.*
  from members m
  where m.status = 'ACTIVE'
    and (p_manager_id is null or m.assigned_manager_id = p_manager_id)
    and is_pending_followup(m.id, p_month, p_year)
  order by m.updated_at desc
$$ language sql stable;
