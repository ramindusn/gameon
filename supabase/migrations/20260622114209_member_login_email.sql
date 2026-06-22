-- 20260622114209_member_login_email.sql — link a member to a login email so the
-- "Logged by" column resolves the signed-in admin to their member name.
-- Nullable; only members who also log in need it.

alter table members add column if not exists email text;

-- Link the founding members to their admin-allowlist emails (demo data).
update members set email = 'redacted-a1@removed.invalid'          where id = '00000000-0000-0000-0000-0000000000a1' and email is null;
update members set email = 'redacted-a2@removed.invalid' where id = '00000000-0000-0000-0000-0000000000a2' and email is null;
update members set email = 'redacted-a3@removed.invalid'   where id = '00000000-0000-0000-0000-0000000000a3' and email is null;
update members set email = 'ramindusn@gmail.com'             where id = '00000000-0000-0000-0000-0000000000a4' and email is null;
