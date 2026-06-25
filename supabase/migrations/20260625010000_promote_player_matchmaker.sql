-- 20260625010000_promote_player_matchmaker.sql — promote an existing player to a
-- matchmaker (TASK-14). A matchmaker IS a player, so instead of create-matchmaker
-- minting a brand-new profile, the admin promotes an existing roster player: the
-- new login is LINKED to that player's existing player_profiles row.
--
-- The trigger gains a `player_id` path: when the matchmaker signup carries a
-- player_id in metadata, it updates that existing (login-less) profile to attach
-- the user_id + username + is_matchmaker, rather than inserting a new row. The
-- legacy "insert a fresh matchmaker profile" path is kept as a fallback. The
-- invite-only guard from the previous migration is preserved.

create or replace function handle_new_auth_user ()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_club   uuid;
  v_player uuid;
begin
  -- 1) Admin via allowlist (first, so admin onboarding keeps working).
  select club_id into v_club
  from admin_allowlist
  where lower(email) = lower(new.email);

  if found then
    insert into admins (user_id, club_id)
    values (new.id, v_club)
    on conflict (user_id) do nothing;
    return new;
  end if;

  -- 2) Matchmaker — only from the admin-run create-matchmaker flow.
  if new.email like '%@matchmaker.gameon.local'
     or nullif(new.raw_user_meta_data ->> 'username', '') is not null then

    v_player := nullif(new.raw_user_meta_data ->> 'player_id', '')::uuid;

    -- 2a) Promote an existing roster player: attach this login to their profile.
    if v_player is not null then
      update player_profiles
         set user_id       = new.id,
             username      = nullif(new.raw_user_meta_data ->> 'username', ''),
             is_matchmaker = true
       where id = v_player
         and user_id is null;
      if not found then
        raise exception 'player not found or already linked to a login';
      end if;
      return new;
    end if;

    -- 2b) Legacy fallback: create a fresh matchmaker profile.
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
