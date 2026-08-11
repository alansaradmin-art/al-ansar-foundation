-- Member IDs are now system-generated (AF-0001, AF-0002, ...), matching the
-- format already used by imported/historical records, so Admin never types
-- one in by hand. Unlike donation_id (a plain sequence — donations are
-- created constantly and never pre-exist outside this app), member_id can't
-- use a sequence directly: imported rows already occupy a range of AF-####
-- codes that a fresh sequence wouldn't know about. Instead, each insert
-- computes "one past the current max AF-#### in the table," which stays
-- correct regardless of how existing rows got their numbers (import or
-- otherwise).

create or replace function generate_member_id()
returns trigger as $$
declare
  v_next int;
begin
  if new.member_id is null or length(trim(new.member_id)) = 0 then
    select coalesce(max(substring(member_id from 'AF-(\d+)$')::int), 0) + 1
    into v_next
    from members
    where member_id ~ '^AF-\d+$';

    new.member_id := 'AF-' || lpad(v_next::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

-- BEFORE INSERT runs before the NOT NULL/UNIQUE constraints are checked, so
-- member_id is already populated by the time those constraints see the row
-- (same pattern as generate_donation_id() in 0005).
create trigger trg_generate_member_id before insert on members
  for each row execute function generate_member_id();
