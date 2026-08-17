-- Each member must have a unique mobile number (nulls excepted — Postgres
-- unique constraints never treat two NULLs as equal, so members with no
-- number recorded are unaffected). Every insert/update now normalizes the
-- number first (api/members.ts's toMemberRow, via api/_lib/phone.ts), so
-- this constraint compares canonical values, not raw user-typed formatting.
--
-- IMPORTANT before running this migration: if any two members already
-- share the exact same stored mobile_number string, this ALTER TABLE will
-- fail with a duplicate-key error. Run this first to find and resolve any
-- such rows (e.g. clear or correct one of them) before retrying:
--
--   select mobile_number, array_agg(member_id) as member_ids
--   from members
--   where mobile_number is not null
--   group by mobile_number
--   having count(*) > 1;
--
-- Note this only catches EXACT-STRING duplicates already in the data —
-- two existing members whose numbers are the same person in different
-- formats (e.g. one with a "+91" prefix, one without) won't be caught
-- retroactively by this migration; they'll only be caught going forward,
-- the next time either record is saved (which normalizes it first).

drop index if exists idx_members_mobile;
alter table members add constraint members_mobile_number_key unique (mobile_number);
