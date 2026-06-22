-- 20260622104305_seed_first_admin.sql — bootstrap the first Admin.
-- The admin_allowlist must contain an Admin's email BEFORE their first magic-link
-- login, otherwise the bootstrap trigger would enrol them as a Matchmaker instead.
-- Idempotent; manage further admins via the dashboard later.

insert into admin_allowlist (email, club_id)
select 'ramindusn@gmail.com', id
from clubs
order by created_at
limit 1
on conflict (email) do nothing;
