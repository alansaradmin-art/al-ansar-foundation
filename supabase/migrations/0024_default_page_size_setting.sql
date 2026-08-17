-- Admin-configurable default page size for every listing (Members,
-- Donations, Follow-ups, Audit Logs, Managers, Donation Engagement
-- report). Same seed pattern as FOLLOW_UP_PENDING_DAY / NON_DONOR_ALERT_THRESHOLD.
insert into app_settings (key, value) values ('DEFAULT_PAGE_SIZE', '10') on conflict (key) do nothing;
