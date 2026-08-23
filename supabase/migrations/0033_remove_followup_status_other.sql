-- Removes OTHER as a follow-up status. It was a catch-all that predates
-- the STARTED/IN_PROGRESS workflow (0028) and doesn't fit the Pending ->
-- Started -> In Progress -> Completed/Not Interested lifecycle the
-- Follow-ups tabs now enforce — closest existing outcome is COMPLETED
-- (it was already a finished/closed record, never open like
-- STARTED/IN_PROGRESS/CALLBACK_REQUIRED), so existing OTHER rows are
-- backfilled there before the constraint stops allowing it.

update monthly_followups set follow_up_status = 'COMPLETED' where follow_up_status = 'OTHER';

alter table monthly_followups drop constraint if exists monthly_followups_follow_up_status_check;
alter table monthly_followups add constraint monthly_followups_follow_up_status_check
  check (follow_up_status in ('STARTED', 'IN_PROGRESS', 'COMPLETED', 'NOT_INTERESTED', 'CALLBACK_REQUIRED'));
