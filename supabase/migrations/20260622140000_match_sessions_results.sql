-- 20260622140000_match_sessions_results.sql — E04 live sessions & scoring (TASK-5.1).
-- A matchmaker starts a session from a generated plan (rounds + mode), then
-- records a winner for each court. Results feed match history (public profiles)
-- and, later, ranking (E05). Club-scoped; club_id is denormalised onto both
-- tables to keep RLS policies simple (same pattern as fund/inventory).
--
-- RLS: public read (anon + authenticated) so the public site can show history /
-- leaderboards; writes are restricted to admins OR matchmakers of the club,
-- mirroring roster writes (is_admin() / is_matchmaker(), set in the E01 identity
-- migration).

-- ---------------------------------------------------------------------------
-- match_sessions — one live (or finished) play session built from a draw.
-- ---------------------------------------------------------------------------
create table match_sessions (
  id         uuid primary key default gen_random_uuid (),
  club_id    uuid not null references clubs (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null, -- the matchmaker/admin who started it
  status     text not null default 'live' check (status in ('live', 'finished')),
  mode       text not null default 'open' check (mode in ('open', 'mixed')),
  rounds     smallint not null check (rounds between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- match_results — one doubles court within a session round. Four player FKs
-- (team A = a1/a2, team B = b1/b2); winner is the winning side, null until set.
-- Players FKs are ON DELETE SET NULL so removing a roster player keeps history.
-- ---------------------------------------------------------------------------
create table match_results (
  id          uuid primary key default gen_random_uuid (),
  club_id     uuid not null references clubs (id) on delete cascade,
  session_id  uuid not null references match_sessions (id) on delete cascade,
  round       smallint not null check (round >= 1),
  court       smallint not null check (court >= 1),
  team_a1     uuid references player_profiles (id) on delete set null,
  team_a2     uuid references player_profiles (id) on delete set null,
  team_b1     uuid references player_profiles (id) on delete set null,
  team_b2     uuid references player_profiles (id) on delete set null,
  winner      text check (winner in ('a', 'b')), -- null = not yet recorded
  created_at  timestamptz not null default now(),
  unique (session_id, round, court)
);

-- FK / lookup indexes.
create index match_sessions_club_idx    on match_sessions (club_id);
create index match_results_club_idx     on match_results (club_id);
create index match_results_session_idx  on match_results (session_id);
-- History-by-player lookups (a player can sit in any of the four slots).
create index match_results_a1_idx on match_results (team_a1);
create index match_results_a2_idx on match_results (team_a2);
create index match_results_b1_idx on match_results (team_b1);
create index match_results_b2_idx on match_results (team_b2);

-- Keep updated_at fresh on sessions (reuse the E01 helper).
create trigger match_sessions_touch
  before update on match_sessions
  for each row execute function touch_updated_at ();

-- ---------------------------------------------------------------------------
-- RLS: public read; admin/matchmaker write within the club.
-- ---------------------------------------------------------------------------
alter table match_sessions enable row level security;
alter table match_results  enable row level security;

-- Public site reads sessions + results (history / leaderboard) with no login.
create policy match_sessions_public_read on match_sessions
  for select using (true);
create policy match_results_public_read on match_results
  for select using (true);

-- Admins and matchmakers of the same club create + manage play.
create policy match_sessions_write_insert on match_sessions
  for insert to authenticated
  with check (is_admin (club_id) or is_matchmaker (club_id));
create policy match_sessions_write_update on match_sessions
  for update to authenticated
  using (is_admin (club_id) or is_matchmaker (club_id))
  with check (is_admin (club_id) or is_matchmaker (club_id));
create policy match_sessions_write_delete on match_sessions
  for delete to authenticated
  using (is_admin (club_id) or is_matchmaker (club_id));

create policy match_results_write_insert on match_results
  for insert to authenticated
  with check (is_admin (club_id) or is_matchmaker (club_id));
create policy match_results_write_update on match_results
  for update to authenticated
  using (is_admin (club_id) or is_matchmaker (club_id))
  with check (is_admin (club_id) or is_matchmaker (club_id));
create policy match_results_write_delete on match_results
  for delete to authenticated
  using (is_admin (club_id) or is_matchmaker (club_id));

-- ---------------------------------------------------------------------------
-- Grants. RLS only filters rows a role can already touch; the base GRANT is
-- still required (this project doesn't auto-grant DML to anon/authenticated).
-- ---------------------------------------------------------------------------
grant select on match_sessions, match_results to anon, authenticated;
grant insert, update, delete on match_sessions, match_results to authenticated;
