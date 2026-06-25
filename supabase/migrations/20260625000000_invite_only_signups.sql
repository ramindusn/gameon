-- 20260625000000_invite_only_signups.sql — close the matchmaker auto-enrol hole
-- (TASK-13). The original handle_new_auth_user enrolled EVERY non-admin auth user
-- as a matchmaker, so anyone who typed an email into the admin magic-link box
-- (signInWithOtp creates users by default) got auto-promoted to a matchmaker with
-- roster + game-day access. Harden it: a matchmaker is created ONLY when the
-- signup came from the admin-run create-matchmaker flow — identifiable by the
-- synthetic `@matchmaker.gameon.local` email and/or a `username` in metadata.
-- Any other self sign-up is rejected (invite-only). Allow-listed admins still
-- self-bootstrap on first magic-link, and create-matchmaker is unaffected.

create or replace function handle_new_auth_user ()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_club uuid;
begin
  -- 1) Admin via allowlist (checked first so admin onboarding keeps working).
  select club_id into v_club
  from admin_allowlist
  where lower(email) = lower(new.email);

  if found then
    insert into admins (user_id, club_id)
    values (new.id, v_club)
    on conflict (user_id) do nothing;
    return new;
  end if;

  -- 2) Matchmaker — ONLY when created by the admin-run create-matchmaker flow
  --    (synthetic email + username metadata). A real-email self sign-up has
  --    neither, so it falls through to the invite-only rejection below.
  if new.email like '%@matchmaker.gameon.local'
     or nullif(new.raw_user_meta_data ->> 'username', '') is not null then
    v_club := nullif(new.raw_user_meta_data ->> 'club_id', '')::uuid;
    if v_club is null then
      if (select count(*) from clubs) <> 1 then
        raise exception 'club_id required in user metadata when not exactly one club exists';
      end if;
      select id into v_club from clubs;
    end if;

    insert into player_profiles (user_id, club_id, nickname, username, skill, is_matchmaker)
    values (
      new.id,
      v_club,
      coalesce(nullif(new.raw_user_meta_data ->> 'nickname', ''), split_part(new.email, '@', 1)),
      nullif(new.raw_user_meta_data ->> 'username', ''),
      nullif(new.raw_user_meta_data ->> 'skill', '')::smallint,
      true
    )
    on conflict (user_id) do nothing;

    return new;
  end if;

  -- 3) Not an allow-listed admin and not a real matchmaker → reject the signup.
  raise exception 'Sign-ups are invite-only';
end;
$$;
