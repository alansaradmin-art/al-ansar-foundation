-- Server-generated, human-readable donation IDs (D000001, D000002, ...).
-- Members keep manually-assigned IDs (existing spreadsheet already has
-- them), but donations are created constantly by managers on their phones,
-- so this removes one more field they'd otherwise have to type.

create sequence donation_id_seq start 1;

create or replace function generate_donation_id()
returns trigger as $$
begin
  if new.donation_id is null or new.donation_id = '' then
    new.donation_id := 'D' || lpad(nextval('donation_id_seq')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

-- BEFORE INSERT runs before the NOT NULL/UNIQUE constraints are checked, so
-- donation_id is already populated by the time those constraints see the row.
create trigger trg_generate_donation_id before insert on donations
  for each row execute function generate_donation_id();
