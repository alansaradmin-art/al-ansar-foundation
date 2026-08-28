-- Configurable "Received By" label for donation receipts (e.g. "Accounts
-- of Al-Ansar Foundation") — replaces showing the individual recording
-- manager's name on the receipt with one consistent, admin-set
-- organizational designation. Same app_settings key-value pattern as the
-- other receipt branding fields (0037_donation_receipts.sql); the recorder
-- embed added there for other pages (e.g. the admin Donations table's own
-- "Recorded By" column) is untouched — this only changes what the receipt
-- itself shows.
insert into app_settings (key, value) values
  ('RECEIPT_RECEIVED_BY_LABEL', '"Accounts of Al-Ansar Foundation"')
on conflict (key) do nothing;
