-- Member Inactivity Management: two read-only functions supporting a
-- scheduled auto-deactivation job and an Admin-only Inactive Members
-- list. The actual UPDATE for deactivation happens in TypeScript (see
-- api/cron/deactivate-stale-members.ts), not here, so it can capture
-- old/new rows for audit logging the same way every other mutation in
-- this codebase does (select-before-update).

-- Members whose latest non-deleted donation (or, if they've never
-- donated, their join date) is more than 3 months old. 3 months is
-- hardcoded per the feature request's literal wording — unlike
-- FOLLOW_UP_PENDING_DAY/NON_DONOR_ALERT_THRESHOLD this wasn't asked to
-- be admin-configurable.
create function stale_active_member_ids()
returns table (member_id uuid) as $$
  select m.id
  from members m
  where m.status = 'ACTIVE'
    and coalesce(
      (select max(d.donation_date) from donations d where d.member_id = m.id and not d.is_deleted),
      m.created_at::date
    ) < (current_date - interval '3 months')
$$ language sql stable;

-- Batched all-time latest donation date per member, for the Inactive
-- Members list's "Last Donation" display — same batching shape/purpose
-- as the existing is_pending_followup_batch() RPC.
create function member_last_donation_dates(p_member_ids uuid[])
returns table (member_id uuid, last_donation_date date) as $$
  select m.id, (select max(d.donation_date) from donations d where d.member_id = m.id and not d.is_deleted)
  from members m
  where m.id = any(p_member_ids)
$$ language sql stable;
