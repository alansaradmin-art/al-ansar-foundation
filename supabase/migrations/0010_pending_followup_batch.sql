-- Batched version of is_pending_followup() for list views (Members list,
-- member cards) that need the real pending-follow-up status for several
-- members at once without one round trip per row. Delegates to the same
-- canonical function used by the Pending Follow-ups screen, so a member's
-- card can never disagree with whether they actually show up there —
-- donation-received and completed-follow-up both correctly clear it here
-- too, and the cutoff-day gating is identical.
create or replace function is_pending_followup_batch(p_member_ids uuid[], p_month smallint, p_year smallint)
returns table (member_id uuid, is_pending boolean) as $$
  select m.id, is_pending_followup(m.id, p_month, p_year)
  from unnest(p_member_ids) as m(id)
$$ language sql stable;
