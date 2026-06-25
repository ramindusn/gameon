-- 20260625200000_add_admins.sql — add three more Admins to the allowlist.
--
-- Applied to dev + prod on 2026-06-25. The actual emails are intentionally NOT
-- stored in version control (admin_allowlist is private by design — its emails
-- are not API-readable). They were inserted out-of-band, idempotently, scoped to
-- the first club, mirroring 20260622104305_seed_first_admin.sql:
--
--   insert into admin_allowlist (email, club_id)
--   select '<email>', id from clubs order by created_at limit 1
--   on conflict (email) do nothing;
--
-- This file is a no-op placeholder so migration history stays in sync with the
-- remotes (which already have the rows). To add further admins, run the insert
-- above directly against each project rather than committing emails here.

-- intentionally no-op
select 1;
