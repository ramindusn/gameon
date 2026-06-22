-- 20260622080321_identity_players_admins.sql — E01 identity (TASK-2.2).
-- Auth model: ADR 0010. Admin = email magic-link; Matchmaker = a player row with a
-- login (username+password via synthetic email). Players are no-login data.
-- Multi-tenant: every table carries club_id, scoped by RLS (ADR 0005).

-- ---------------------------------------------------------------------------
-- Bootstrap club. Single club to start (ADR 0005); idempotent so re-runs / fresh
-- environments converge to exactly one default club for the single-club fallback.
-- ---------------------------------------------------------------------------
insert into clubs (name)
select 'Badminton Duo'
where not exists (select 1 from clubs);

-- ---------------------------------------------------------------------------
-- Admin allowlist: emails that become Admins (club-ops) on first magic-link login.
-- Not a player, not a Matchmaker. Service-role managed only (no anon/auth policies).
-- ---------------------------------------------------------------------------
create table admin_allowlist (
  email      text primary key,
  club_id    uuid not null references clubs (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admin_allowlist enable row level security;
-- No policies: denied for anon/authenticated. Reachable only via service role
-- (Edge Functions) and the security-definer bootstrap trigger below.

-- ---------------------------------------------------------------------------
-- Admins: resolved Admin accounts. One auth user -> one admin row.
-- ---------------------------------------------------------------------------
create table admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  club_id    uuid not null references clubs (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;

-- An admin can read their own row (role resolution); writes are service-role only.
create policy admins_self_read on admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Player profiles: the roster. user_id is set only for Matchmakers (players who
-- log in); plain players have user_id = null. Public-readable for profiles/search.
-- ---------------------------------------------------------------------------
create table player_profiles (
  id             uuid primary key default gen_random_uuid (),
  club_id        uuid not null references clubs (id) on delete cascade,
  user_id        uuid unique references auth.users (id) on delete set null,
  nickname       text not null,
  username       text unique,                              -- Matchmaker login handle
  skill          smallint check (skill between 1 and 5),   -- coarse seed for matchEngine
  is_matchmaker  boolean not null default false,
  absent         boolean not null default false,           -- excluded from draws when true
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index player_profiles_club_idx on player_profiles (club_id);

alter table player_profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Role helpers. security definer + owner (postgres) bypasses RLS, so reading
-- player_profiles/admins from inside a player_profiles policy does NOT recurse.
-- ---------------------------------------------------------------------------
create function is_admin (club uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1 from admins
    where user_id = auth.uid() and club_id = club
  );
$$;

create function is_matchmaker (club uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1 from player_profiles
    where user_id = auth.uid() and is_matchmaker and club_id = club
  );
$$;

-- Public site reads profiles, leaderboard, and search with no login (REQUIREMENTS).
create policy player_profiles_public_read on player_profiles
  for select using (true);

-- Matchmakers and Admins of the same club manage the roster.
create policy player_profiles_write_insert on player_profiles
  for insert to authenticated
  with check (is_admin (club_id) or is_matchmaker (club_id));

create policy player_profiles_write_update on player_profiles
  for update to authenticated
  using (is_admin (club_id) or is_matchmaker (club_id))
  with check (is_admin (club_id) or is_matchmaker (club_id));

create policy player_profiles_write_delete on player_profiles
  for delete to authenticated
  using (is_admin (club_id) or is_matchmaker (club_id));

-- keep updated_at fresh
create function touch_updated_at ()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger player_profiles_touch
  before update on player_profiles
  for each row execute function touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Bootstrap trigger: on a new auth user, allowlisted email -> Admin; everyone
-- else -> enrolled as a player with a login (a Matchmaker). Players proper are
-- inserted directly via the app and never reach this path (no auth.users row).
-- raw_user_meta_data carries club_id/nickname/username/skill set at sign-up.
-- ---------------------------------------------------------------------------
create function handle_new_auth_user ()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_club uuid;
begin
  -- Admin via allowlist.
  select club_id into v_club
  from admin_allowlist
  where lower(email) = lower(new.email);

  if found then
    insert into admins (user_id, club_id)
    values (new.id, v_club)
    on conflict (user_id) do nothing;
    return new;
  end if;

  -- Non-admin signup -> Matchmaker (a player with a login).
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
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user ();
