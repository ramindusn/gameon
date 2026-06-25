-- 20260622114209_member_login_email.sql — link a member to a login email so the
-- "Logged by" column resolves the signed-in admin to their member name.
-- Nullable; only members who also log in need it.

alter table members add column if not exists email text;

-- Founding members' login emails are set out-of-band (not stored in VCS — they're
-- personal data). Already applied to the live projects; managed in the DB directly.
update members set email = 'ramindusn@gmail.com' where id = '00000000-0000-0000-0000-0000000000a4' and email is null;
