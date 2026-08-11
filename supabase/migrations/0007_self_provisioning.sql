-- Self-service profile provisioning.
--
-- The Clerk webhook (api/webhooks/clerk.ts) only fires when Clerk can reach
-- a real public URL, which local development doesn't have. This function
-- does the identical matching logic (admin email -> ADMIN, managers.email
-- match -> MANAGER, else leave unprovisioned) but is called directly by the
-- signed-in browser, so it works everywhere — localhost included — with no
-- deploy or tunnel required. The webhook stays in place as a production
-- nicety (e.g. reconciling a Clerk email change without the user having to
-- reload the app), but it is no longer load-bearing for sign-in to work.
--
-- Safe by construction: a caller can only ever provision themselves
-- (clerk_user_id is taken from their own auth.jwt(), never a parameter),
-- and only into ADMIN if their email is the one configured foundation-wide,
-- or into MANAGER if their email matches an existing managers row.

insert into app_settings (key, value) values
  ('FOUNDATION_ADMIN_EMAIL', '"alansar.admin@gmail.com"')
on conflict (key) do nothing;

create or replace function provision_my_profile(p_email text, p_full_name text)
returns profiles as $$
declare
  v_clerk_user_id text := auth.jwt() ->> 'sub';
  v_email text := lower(trim(p_email));
  v_admin_email text := lower(trim((select value #>> '{}' from app_settings where key = 'FOUNDATION_ADMIN_EMAIL')));
  v_manager managers%rowtype;
  v_profile profiles%rowtype;
begin
  if v_clerk_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Already provisioned — return as-is, don't re-derive role/manager.
  select * into v_profile from profiles where clerk_user_id = v_clerk_user_id;
  if found then
    return v_profile;
  end if;

  if v_email = v_admin_email then
    insert into profiles (clerk_user_id, email, full_name, role, manager_id, is_active)
    values (v_clerk_user_id, v_email, coalesce(nullif(p_full_name, ''), 'Al Ansar Foundation Admin'), 'ADMIN', null, true)
    returning * into v_profile;
    return v_profile;
  end if;

  select * into v_manager from managers where lower(email) = v_email;
  if found then
    insert into profiles (clerk_user_id, email, full_name, role, manager_id, is_active)
    values (
      v_clerk_user_id, v_email, coalesce(nullif(p_full_name, ''), v_manager.full_name),
      'MANAGER', v_manager.id, v_manager.status = 'ACTIVE'
    )
    returning * into v_profile;
    return v_profile;
  end if;

  -- No match: leave unprovisioned. Admin needs to add/correct this email
  -- in the managers table (or the FOUNDATION_ADMIN_EMAIL setting).
  return null;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function provision_my_profile(text, text) to authenticated;
