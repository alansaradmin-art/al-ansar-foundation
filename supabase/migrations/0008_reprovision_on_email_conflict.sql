-- If a Clerk user is deleted and signs up again with the same email, Clerk
-- issues a brand-new clerk_user_id. provision_my_profile() correctly finds
-- no row for that new id and tries to insert one — but collides with the
-- old orphaned row on the profiles.email unique constraint, since nothing
-- ever cleaned that row up. Re-linking the email to whichever Clerk account
-- is currently signing in is exactly the desired behavior here, so this
-- becomes an upsert on email instead of a bare insert.

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
    on conflict (email) do update set
      clerk_user_id = excluded.clerk_user_id,
      full_name = excluded.full_name,
      role = excluded.role,
      manager_id = excluded.manager_id,
      is_active = excluded.is_active,
      updated_at = now()
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
    on conflict (email) do update set
      clerk_user_id = excluded.clerk_user_id,
      full_name = excluded.full_name,
      role = excluded.role,
      manager_id = excluded.manager_id,
      is_active = excluded.is_active,
      updated_at = now()
    returning * into v_profile;
    return v_profile;
  end if;

  -- No match: leave unprovisioned. Admin needs to add/correct this email
  -- in the managers table (or the FOUNDATION_ADMIN_EMAIL setting).
  return null;
end;
$$ language plpgsql security definer set search_path = public;
