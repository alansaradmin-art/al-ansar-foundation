-- Al Ansar Foundation — functions & triggers

-- ── updated_at maintenance ────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_managers_updated_at before update on managers
  for each row execute function set_updated_at();
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_members_updated_at before update on members
  for each row execute function set_updated_at();
create trigger trg_donations_updated_at before update on donations
  for each row execute function set_updated_at();
create trigger trg_followups_updated_at before update on monthly_followups
  for each row execute function set_updated_at();

-- ── current_profile(): resolves the calling Clerk user to a profile row ──
-- security definer so it can read profiles regardless of the caller's own
-- RLS grants; it is the join key every RLS policy below relies on.
create or replace function current_profile()
returns table (id uuid, role text, manager_id uuid, is_active boolean) as $$
  select id, role, manager_id, is_active
  from profiles
  where clerk_user_id = auth.jwt() ->> 'sub'
$$ language sql stable security definer set search_path = public;

create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from current_profile() where role = 'ADMIN' and is_active);
$$ language sql stable security definer set search_path = public;

create or replace function my_manager_id()
returns uuid as $$
  select manager_id from current_profile() where role = 'MANAGER' and is_active;
$$ language sql stable security definer set search_path = public;

-- ── get_current_period(): server-authoritative "now" in IST ─────────────
-- The frontend uses this to default month/year pickers so the UI's idea of
-- "current month" always agrees with the database's — never the browser clock.
create or replace function get_current_period()
returns table (month smallint, year smallint, day smallint) as $$
  select
    extract(month from (now() at time zone 'Asia/Kolkata'))::smallint,
    extract(year from (now() at time zone 'Asia/Kolkata'))::smallint,
    extract(day from (now() at time zone 'Asia/Kolkata'))::smallint
$$ language sql stable;

-- ── is_pending_followup(): single source of truth for the pending rule ──
-- After the configured cutoff day of the *current* month (or for any month
-- that has already fully elapsed): pending = no donation received for that
-- member that month AND no completed follow-up recorded that month.
create or replace function is_pending_followup(p_member_id uuid, p_month smallint, p_year smallint)
returns boolean as $$
declare
  v_cutoff_day int := coalesce(
    (select (value #>> '{}')::int from app_settings where key = 'FOLLOW_UP_PENDING_DAY'), 20
  );
  v_ist_now timestamptz := now() at time zone 'Asia/Kolkata';
  v_is_current_period boolean := (p_year, p_month) =
    (extract(year from v_ist_now)::int, extract(month from v_ist_now)::int);
  v_is_future_period boolean := (p_year, p_month) >
    (extract(year from v_ist_now)::int, extract(month from v_ist_now)::int);
  v_past_cutoff boolean := (not v_is_current_period) or extract(day from v_ist_now)::int > v_cutoff_day;
begin
  if v_is_future_period or not v_past_cutoff then
    return false;
  end if;

  if exists (
    select 1 from donations
    where member_id = p_member_id and donation_month = p_month
      and donation_year = p_year and not is_deleted
  ) then
    return false;
  end if;

  if exists (
    select 1 from monthly_followups
    where member_id = p_member_id and month = p_month
      and year = p_year and follow_up_status = 'COMPLETED'
  ) then
    return false;
  end if;

  return true;
end;
$$ language plpgsql stable;

-- ── added_by / reference_contact integrity ───────────────────────────────
-- added_by_id / reference_contact_id are polymorphic (members or managers,
-- depending on *_type) so they cannot be plain foreign keys. This trigger
-- confirms the referenced row exists in the right table whenever an id is
-- supplied, without forcing external contacts to become system users.
create or replace function validate_member_contacts()
returns trigger as $$
begin
  if new.added_by_type = 'REGISTERED_MEMBER' and new.added_by_id is not null then
    if not exists (select 1 from members where id = new.added_by_id) then
      raise exception 'added_by_id % does not reference an existing member', new.added_by_id;
    end if;
  elsif new.added_by_type = 'MANAGER' and new.added_by_id is not null then
    if not exists (select 1 from managers where id = new.added_by_id) then
      raise exception 'added_by_id % does not reference an existing manager', new.added_by_id;
    end if;
  end if;

  if new.reference_contact_type = 'REGISTERED_MEMBER' and new.reference_contact_id is not null then
    if not exists (select 1 from members where id = new.reference_contact_id) then
      raise exception 'reference_contact_id % does not reference an existing member', new.reference_contact_id;
    end if;
  elsif new.reference_contact_type = 'MANAGER' and new.reference_contact_id is not null then
    if not exists (select 1 from managers where id = new.reference_contact_id) then
      raise exception 'reference_contact_id % does not reference an existing manager', new.reference_contact_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validate_member_contacts before insert or update on members
  for each row execute function validate_member_contacts();

-- ── audit logging ──────────────────────────────────────────
create or replace function write_audit_log()
returns trigger as $$
declare
  v_actor uuid := (select id from current_profile());
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := tg_table_name || '_created';
    insert into audit_logs (actor_profile_id, action, entity_type, entity_id, new_value)
    values (v_actor, v_action, tg_table_name, new.id, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    v_action := tg_table_name || '_updated';
    insert into audit_logs (actor_profile_id, action, entity_type, entity_id, old_value, new_value)
    values (v_actor, v_action, tg_table_name, new.id, to_jsonb(old), to_jsonb(new));
    return new;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_audit_members after insert or update on members
  for each row execute function write_audit_log();
create trigger trg_audit_donations after insert or update on donations
  for each row execute function write_audit_log();
create trigger trg_audit_followups after insert or update on monthly_followups
  for each row execute function write_audit_log();
create trigger trg_audit_managers after insert or update on managers
  for each row execute function write_audit_log();
