-- 20260622131700_player_gender.sql — players carry a gender so the generator can
-- build mixed-doubles fixtures. Nullable; constrained to male/female/other.

alter table player_profiles add column if not exists gender text
  check (gender in ('male', 'female', 'other'));

-- Carry gender from signup metadata when a matchmaker account is created.
create or replace function handle_new_auth_user ()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_club uuid;
begin
  select club_id into v_club
  from admin_allowlist
  where lower(email) = lower(new.email);

  if found then
    insert into admins (user_id, club_id)
    values (new.id, v_club)
    on conflict (user_id) do nothing;
    return new;
  end if;

  v_club := nullif(new.raw_user_meta_data ->> 'club_id', '')::uuid;
  if v_club is null then
    if (select count(*) from clubs) <> 1 then
      raise exception 'club_id required in user metadata when not exactly one club exists';
    end if;
    select id into v_club from clubs;
  end if;

  insert into player_profiles (user_id, club_id, nickname, username, skill, gender, is_matchmaker)
  values (
    new.id,
    v_club,
    coalesce(nullif(new.raw_user_meta_data ->> 'nickname', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'skill', '')::smallint,
    nullif(new.raw_user_meta_data ->> 'gender', ''),
    true
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;
