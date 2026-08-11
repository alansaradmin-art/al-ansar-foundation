-- Removing Supabase Third-Party Auth, final step.
--
-- provision_my_profile() derives the caller's clerk_user_id from
-- auth.jwt()->>'sub', which is only ever populated for a request carrying a
-- real Clerk-issued JWT (the old browser-side Supabase client). It cannot be
-- called successfully via the service-role key the new API layer uses
-- instead (auth.jwt() is empty for a service-role connection). Its logic is
-- replicated in TypeScript in api/_lib/auth.ts's getOrProvisionProfile() —
-- deliberately NOT by reworking this function's signature to accept
-- clerk_user_id as a parameter, since a version any `authenticated` caller
-- could invoke with an arbitrary clerk_user_id + the admin's email would
-- let them self-provision as ADMIN.
--
-- DO NOT apply this migration until the new server-side API layer
-- (api/profile.ts and friends) is deployed and verified end-to-end in
-- production — the currently-deployed frontend still calls this RPC on
-- every sign-in until that cutover ships. See DEPLOYMENT.md's migration
-- table for the exact ordering.

drop function if exists provision_my_profile(text, text);
