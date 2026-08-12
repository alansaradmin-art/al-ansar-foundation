-- Mandatory donation_type on every donation (Zakat / Sadaqah-Sadka / Fitra /
-- General Donation / Other). Backfill existing rows to GENERAL before
-- locking the column down, then drop the implicit default so every future
-- insert must specify it explicitly — same "no default, always explicit"
-- shape as payment_method.

alter table donations add column donation_type text;
update donations set donation_type = 'GENERAL' where donation_type is null;
alter table donations alter column donation_type set not null;
alter table donations add constraint donations_donation_type_check
  check (donation_type in ('ZAKAT', 'SADAQAH', 'FITRA', 'GENERAL', 'OTHER'));
