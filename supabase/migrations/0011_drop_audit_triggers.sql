-- Removing Supabase Third-Party Auth: write_audit_log() derives its actor
-- via current_profile() -> auth.jwt()->>'sub', which is empty once nothing
-- browser-side presents a Clerk JWT to Postgres anymore (the new API layer
-- talks to Supabase entirely through the service-role key, which bypasses
-- auth.jwt() by design). Left as-is, every audit row would silently get
-- actor_profile_id = NULL. The new server-side API layer writes audit_logs
-- rows explicitly instead, with the actor resolved from the caller's
-- already-verified Clerk session (see api/_lib/auditLog.ts) — so these
-- triggers are now redundant as well as broken.

drop trigger if exists trg_audit_members on members;
drop trigger if exists trg_audit_donations on donations;
drop trigger if exists trg_audit_followups on monthly_followups;
drop trigger if exists trg_audit_managers on managers;
drop function if exists write_audit_log();
