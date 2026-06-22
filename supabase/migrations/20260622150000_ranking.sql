-- 20260622150000_ranking.sql — E05 ranking storage & recompute inputs (TASK-6.3).
-- See ADR 0011. Individual + per-pair Glicko-2 boards are recomputed server-side
-- (the recompute-ratings Edge Function, service role) by replaying finished
-- sessions; one locked/finished session = one rating period. This migration adds
-- the inputs (per-match point scores) and the two output boards.
--
-- RLS: public read (anon + authenticated) so the public site shows leaderboards;
-- the boards are NEVER written by app users — only the service-role recompute
-- writes them, so there are no authenticated write policies (service role
-- bypasses RLS).

-- ---------------------------------------------------------------------------
-- Inputs: per-match point scores. Winner alone can't express margin (ADR 0011),
-- so record the final points; nullable until entered (a recorded winner with
-- null scores degrades to a 1/0 win-share at recompute time).
-- ---------------------------------------------------------------------------
alter table match_results
  add column score_a smallint check (score_a is null or score_a >= 0),
  add column score_b smallint check (score_b is null or score_b >= 0);

-- ---------------------------------------------------------------------------
-- player_ratings — the individual board. One row per rated player.
-- ---------------------------------------------------------------------------
create table player_ratings (
  player_id  uuid primary key references player_profiles (id) on delete cascade,
  club_id    uuid not null references clubs (id) on delete cascade,
  rating     double precision not null default 1500,
  rd         double precision not null default 350,
  volatility double precision not null default 0.06,
  games      integer not null default 0 check (games >= 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- pair_ratings — the doubles board. One row per partnership. Player ids are
-- stored sorted (player1_id < player2_id) so a pair has a single canonical row,
-- matching the engine's order-independent pair key.
-- ---------------------------------------------------------------------------
create table pair_ratings (
  id         uuid primary key default gen_random_uuid (),
  club_id    uuid not null references clubs (id) on delete cascade,
  player1_id uuid not null references player_profiles (id) on delete cascade,
  player2_id uuid not null references player_profiles (id) on delete cascade,
  rating     double precision not null default 1500,
  rd         double precision not null default 350,
  volatility double precision not null default 0.06,
  games      integer not null default 0 check (games >= 0),
  updated_at timestamptz not null default now(),
  check (player1_id < player2_id),
  unique (club_id, player1_id, player2_id)
);

-- Leaderboard ordering: strongest-first within a club.
create index player_ratings_board_idx on player_ratings (club_id, rating desc);
create index pair_ratings_board_idx   on pair_ratings (club_id, rating desc);
create index pair_ratings_p1_idx      on pair_ratings (player1_id);
create index pair_ratings_p2_idx      on pair_ratings (player2_id);

-- ---------------------------------------------------------------------------
-- RLS: public read; writes only by the service-role recompute (no user policy).
-- ---------------------------------------------------------------------------
alter table player_ratings enable row level security;
alter table pair_ratings   enable row level security;

create policy player_ratings_public_read on player_ratings
  for select using (true);
create policy pair_ratings_public_read on pair_ratings
  for select using (true);

-- Public site reads both boards with no login. No insert/update/delete grants to
-- app roles: the Edge Function uses the service role, which bypasses RLS.
grant select on player_ratings, pair_ratings to anon, authenticated;
