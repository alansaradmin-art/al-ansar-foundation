-- Admin-only "Anonymous Donation" feature: a donation recorded with no
-- member attached at all. member_id NULL is the complete signal for this —
-- no separate is_anonymous flag, to avoid a second source of truth that
-- could drift from the first.
--
-- No RLS changes needed: donations_insert/donations_select's admin
-- branches (0003_rls.sql) already have no dependency on member_id, and no
-- other trigger/function assumes it's non-null in a way that breaks
-- (generate_donation_id() is independent of it; is_pending_followup() and
-- the dashboard aggregates are always called with/scoped to a real
-- member_id, so a NULL-member_id row simply never matches those, which is
-- the desired behavior — an anonymous donation isn't attributable to any
-- member or manager).

alter table donations alter column member_id drop not null;
