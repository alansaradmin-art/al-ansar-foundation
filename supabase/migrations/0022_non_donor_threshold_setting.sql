-- Admin Dashboard "Needs Attention" — Managers With High Non-Donor
-- Count needs a configurable threshold (percentage), not a hardcoded
-- one. Same shape as the existing FOLLOW_UP_PENDING_DAY setting: a
-- bare JSON number, read/written via api/settings.ts.

insert into app_settings (key, value)
values ('NON_DONOR_ALERT_THRESHOLD', '50')
on conflict (key) do nothing;
