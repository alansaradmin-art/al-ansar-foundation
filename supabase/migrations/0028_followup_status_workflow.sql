-- Follow-up status workflow: NOT_STARTED is split into STARTED (initiated)
-- and IN_PROGRESS (ongoing, needs further action) for more specific
-- tracking. COMPLETED/NOT_INTERESTED/CALLBACK_REQUIRED/OTHER are unchanged.

-- Backfill first — a live NOT_STARTED row would violate the new
-- constraint below. STARTED is the closest equivalent ("initiated").
update monthly_followups set follow_up_status = 'STARTED' where follow_up_status = 'NOT_STARTED';

alter table monthly_followups drop constraint if exists monthly_followups_follow_up_status_check;
alter table monthly_followups add constraint monthly_followups_follow_up_status_check
  check (follow_up_status in ('STARTED', 'IN_PROGRESS', 'COMPLETED', 'NOT_INTERESTED', 'CALLBACK_REQUIRED', 'OTHER'));
