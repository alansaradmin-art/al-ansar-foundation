-- Al Ansar Foundation — Row Level Security
-- Default-deny: RLS is enabled on every table with no policy = nobody can
-- touch it. Manager isolation and Admin-only edit rules are enforced here,
-- not in the React layer — a manager cannot bypass this by editing a
-- request, because Postgres re-derives ownership server-side.

alter table profiles enable row level security;
alter table managers enable row level security;
alter table members enable row level security;
alter table donations enable row level security;
alter table monthly_followups enable row level security;
alter table audit_logs enable row level security;
alter table app_settings enable row level security;

-- ── profiles ──────────────────────────────────────────────
-- Row creation/linking happens only via the Clerk webhook using the
-- service_role key (which bypasses RLS entirely), never from the browser.
create policy profiles_select_own_or_admin on profiles
  for select using (
    clerk_user_id = auth.jwt() ->> 'sub' or is_admin()
  );

create policy profiles_update_admin on profiles
  for update using (is_admin()) with check (is_admin());

-- ── managers ──────────────────────────────────────────────
create policy managers_select on managers
  for select using (
    is_admin() or id = my_manager_id()
  );

create policy managers_insert_admin on managers
  for insert with check (is_admin());

create policy managers_update_admin on managers
  for update using (is_admin()) with check (is_admin());

create policy managers_delete_admin on managers
  for delete using (is_admin());

-- ── members ───────────────────────────────────────────────
-- Managers never write members directly (Admin adds/assigns; import is a
-- service-role endpoint) — they only read their own assigned members.
create policy members_select on members
  for select using (
    is_admin() or assigned_manager_id = my_manager_id()
  );

create policy members_insert_admin on members
  for insert with check (is_admin());

create policy members_update_admin on members
  for update using (is_admin()) with check (is_admin());

create policy members_delete_admin on members
  for delete using (is_admin());

-- ── donations ─────────────────────────────────────────────
-- Managers can record a donation for their own member, but recorded_by is
-- forced to themselves and cannot be forged. No manager UPDATE/DELETE —
-- corrections are Admin-only, always, per foundation policy.
create policy donations_select on donations
  for select using (
    is_admin() or
    exists (
      select 1 from members m
      where m.id = donations.member_id and m.assigned_manager_id = my_manager_id()
    )
  );

create policy donations_insert on donations
  for insert with check (
    (is_admin() and recorded_by = (select id from current_profile()))
    or (
      recorded_by = (select id from current_profile())
      and exists (
        select 1 from members m
        where m.id = donations.member_id and m.assigned_manager_id = my_manager_id()
      )
    )
  );

create policy donations_update_admin on donations
  for update using (is_admin()) with check (is_admin());

create policy donations_delete_admin on donations
  for delete using (is_admin());

-- ── monthly_followups ─────────────────────────────────────
create policy followups_select on monthly_followups
  for select using (
    is_admin() or
    exists (
      select 1 from members m
      where m.id = monthly_followups.member_id and m.assigned_manager_id = my_manager_id()
    )
  );

create policy followups_insert on monthly_followups
  for insert with check (
    created_by = (select id from current_profile())
    and (
      is_admin()
      or (
        manager_id = my_manager_id()
        and exists (
          select 1 from members m
          where m.id = monthly_followups.member_id and m.assigned_manager_id = my_manager_id()
        )
      )
    )
  );

create policy followups_update_admin on monthly_followups
  for update using (is_admin()) with check (is_admin());

create policy followups_delete_admin on monthly_followups
  for delete using (is_admin());

-- ── audit_logs (append-only, Admin read-only) ────────────
create policy audit_logs_select_admin on audit_logs
  for select using (is_admin());
-- Intentionally no insert/update/delete policy for any client role.
-- Rows are written only by the security-definer write_audit_log() trigger.

-- ── app_settings ───────────────────────────────────────────
create policy app_settings_select on app_settings
  for select using (true);

create policy app_settings_update_admin on app_settings
  for update using (is_admin()) with check (is_admin());

create policy app_settings_insert_admin on app_settings
  for insert with check (is_admin());
