-- Donation receipts. No new numbering scheme needed — donations.donation_id
-- (the existing D000001-style sequence from 0005_donation_id_sequence.sql)
-- is already unique, sequential, and immutable per row; the app formats it
-- for display as AF-{donation_year}-{sequence} purely client-side, never
-- stored (src/features/donations/receipt/receiptData.ts).
--
-- donor_name is the one real gap: an anonymous donation (member_id null,
-- see 0013_nullable_donation_member.sql) captures no identity at all today,
-- and a receipt needs *something* to address. Only ever set/shown when
-- member_id is null — a member donation's name always comes from the member
-- record itself. No donor_phone column: unknown-donor WhatsApp sharing is
-- always a manual "pick a recipient" flow (see receipt module), which needs
-- no stored number.
alter table donations add column donor_name text;

-- Receipt branding, in the existing app_settings key-value mechanism —
-- same pattern as FOLLOW_UP_PENDING_DAY/NON_DONOR_ALERT_THRESHOLD/etc.
-- Logo/banner are plain URLs (admin pastes one; blank means "use this
-- app's existing /Logo.jpeg /Banner.jpeg defaults") rather than a new
-- upload/storage flow.
insert into app_settings (key, value) values
  ('RECEIPT_LOGO_URL', '""'),
  ('RECEIPT_BANNER_URL', '""'),
  ('RECEIPT_FOOTER_TEXT', '"Thank you for your valuable contribution to Al Ansar Foundation.\nMay Allah accept your contribution and reward you abundantly. Ameen."'),
  ('RECEIPT_CONTACT_INFO', '"Al Ansar Foundation, Hatwa Bazar"')
on conflict (key) do nothing;
