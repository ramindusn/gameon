-- 20260622081141_identity_harden_funcs.sql — grants + security hardening for E01
-- (follow-up to identity_players_admins; addresses database-linter findings).

-- ---------------------------------------------------------------------------
-- Table privileges. RLS only filters rows a role can already touch; without a
-- base GRANT the public-read policies return nothing. This project's default
-- privileges do NOT auto-grant DML to anon/authenticated, so grant explicitly.
-- ---------------------------------------------------------------------------

-- Pre-existing gap: clubs_public_read (init migration) was dead without this.
grant select on clubs to anon, authenticated;

-- Roster is public-read; writes are RLS-restricted to admins/matchmakers.
grant select on player_profiles to anon, authenticated;
grant insert, update, delete on player_profiles to authenticated;

-- Admins read their own row (admins_self_read); anon/admin_allowlist stay locked.
grant select on admins to authenticated;

-- ---------------------------------------------------------------------------
-- Function hardening (lints 0011 / 0028 / 0029).
-- ---------------------------------------------------------------------------

-- touch_updated_at had a mutable search_path (lint 0011). Pin it.
alter function touch_updated_at () set search_path = '';

-- Lock down the SECURITY DEFINER functions so they are not callable as PostgREST
-- RPCs by untrusted roles (lints 0028/0029).

-- Trigger-only: never call directly. Strip EXECUTE from all client roles.
revoke execute on function handle_new_auth_user () from public, anon, authenticated;

-- Policy helpers: evaluated inside player_profiles RLS, so the `authenticated`
-- role must keep EXECUTE; anon never hits a policy that calls them.
revoke execute on function is_admin (uuid) from public, anon;
revoke execute on function is_matchmaker (uuid) from public, anon;
grant  execute on function is_admin (uuid) to authenticated;
grant  execute on function is_matchmaker (uuid) to authenticated;
