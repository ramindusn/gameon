-- 20260806020000_tournament_teams.sql — give a fixed-pairs team an identity of
-- its own, so a substitution keeps its record (TASK-80).
--
-- A "pair" was only ever two player ids on match_results. Swap one member and it
-- becomes a different pair, which is why standings would split a substituted
-- team into two rows. The user's choice is a substitution: the team carries on,
-- one member is replaced from a round onward, and the day reads as one entry.
--
-- So the team becomes a row. match_results points at it, and standings group by
-- the team rather than by whoever happened to be on court.
--
-- player1_id / player2_id are the team's CURRENT members. History lives on
-- match_results, which keeps the players who actually played each match —
-- substituting rewrites only fixtures that have not been scored yet.

create table tournament_teams (
  id         uuid primary key default gen_random_uuid (),
  club_id    uuid not null references clubs (id) on delete cascade,
  session_id uuid not null references match_sessions (id) on delete cascade,
  -- Restricted rather than cascaded: losing a roster row must not silently
  -- delete a team that has results behind it.
  player1_id uuid not null references player_profiles (id) on delete restrict,
  player2_id uuid not null references player_profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  check (player1_id <> player2_id)
);

create index tournament_teams_session_idx on tournament_teams (session_id);

-- ON DELETE SET NULL: a removed team must not take the match history with it.
alter table match_results
  add column team_a_id uuid references tournament_teams (id) on delete set null,
  add column team_b_id uuid references tournament_teams (id) on delete set null;

create index match_results_team_a_idx on match_results (team_a_id);
create index match_results_team_b_idx on match_results (team_b_id);

-- ---------------------------------------------------------------------------
-- Backfill: existing tournaments have teams, they just were not written down.
-- Every distinct pair on a tournament's fixtures becomes a team, and its
-- matches are linked. Pairs are read in sorted order so the same two players
-- give one team however the fixture listed them.
-- ---------------------------------------------------------------------------
do $$
declare
  s record;
  p record;
  t uuid;
begin
  for s in select id, club_id from match_sessions where kind = 'tournament' loop
    for p in
      select distinct least(a, b) as p1, greatest(a, b) as p2 from (
        select team_a1 as a, team_a2 as b from match_results where session_id = s.id
        union all
        select team_b1, team_b2 from match_results where session_id = s.id
      ) x where a is not null and b is not null and a <> b
    loop
      insert into tournament_teams (club_id, session_id, player1_id, player2_id)
      values (s.club_id, s.id, p.p1, p.p2)
      returning id into t;

      update match_results
         set team_a_id = t
       where session_id = s.id
         and least(team_a1, team_a2) = p.p1 and greatest(team_a1, team_a2) = p.p2;
      update match_results
         set team_b_id = t
       where session_id = s.id
         and least(team_b1, team_b2) = p.p1 and greatest(team_b1, team_b2) = p.p2;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS mirrors match_results: game days are public to read, matchmakers and
-- admins of the club write them.
-- ---------------------------------------------------------------------------
alter table tournament_teams enable row level security;

create policy tournament_teams_public_read on tournament_teams
  for select using (true);
create policy tournament_teams_write_insert on tournament_teams
  for insert to authenticated with check (is_admin (club_id) or is_matchmaker (club_id));
create policy tournament_teams_write_update on tournament_teams
  for update to authenticated
  using (is_admin (club_id) or is_matchmaker (club_id))
  with check (is_admin (club_id) or is_matchmaker (club_id));
create policy tournament_teams_write_delete on tournament_teams
  for delete to authenticated using (is_admin (club_id) or is_matchmaker (club_id));

grant select on tournament_teams to anon, authenticated;
grant insert, update, delete on tournament_teams to authenticated;

-- ---------------------------------------------------------------------------
-- Substitute one member of a team from a round onward.
--
-- Two writes that must not come apart: the team's membership, and every fixture
-- it has not yet played. Done separately, a failure between them would leave the
-- team saying one thing and the schedule another.
--
-- Only unscored fixtures are rewritten. A match already played keeps the players
-- who actually played it — that is the whole point of substituting forward
-- rather than rewriting history.
-- ---------------------------------------------------------------------------
create or replace function substitute_team_player (
  p_team_id    uuid,
  p_out_player uuid,
  p_in_player  uuid,
  p_from_round integer default null
) returns integer
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  t       record;
  v_from  integer;
  n       integer := 0;
begin
  select * into t from tournament_teams where id = p_team_id;
  if not found then raise exception 'No such team'; end if;

  if not (is_admin (t.club_id) or is_matchmaker (t.club_id)) then
    raise exception 'Only a matchmaker or an admin can change a pair'
      using errcode = 'insufficient_privilege';
  end if;

  if p_out_player not in (t.player1_id, t.player2_id) then
    raise exception 'That player is not in this pair';
  end if;
  if p_in_player in (t.player1_id, t.player2_id) then
    raise exception 'That player is already in this pair';
  end if;
  if exists (
    select 1 from tournament_teams o
     where o.session_id = t.session_id and o.id <> t.id
       and p_in_player in (o.player1_id, o.player2_id)
  ) then
    raise exception 'That player is already in another pair on this game day';
  end if;

  -- Default: from the first round that has not been scored yet.
  v_from := coalesce(p_from_round, (
    select min(round) from match_results
     where session_id = t.session_id and winner is null
       and (team_a_id = p_team_id or team_b_id = p_team_id)
  ));
  if v_from is null then
    -- Nothing left to play; just record the new membership.
    v_from := 2147483647;
  end if;

  update tournament_teams
     set player1_id = case when player1_id = p_out_player then p_in_player else player1_id end,
         player2_id = case when player2_id = p_out_player then p_in_player else player2_id end
   where id = p_team_id;

  update match_results
     set team_a1 = case when team_a1 = p_out_player then p_in_player else team_a1 end,
         team_a2 = case when team_a2 = p_out_player then p_in_player else team_a2 end
   where session_id = t.session_id and team_a_id = p_team_id
     and winner is null and round >= v_from;
  get diagnostics n = row_count;

  update match_results
     set team_b1 = case when team_b1 = p_out_player then p_in_player else team_b1 end,
         team_b2 = case when team_b2 = p_out_player then p_in_player else team_b2 end
   where session_id = t.session_id and team_b_id = p_team_id
     and winner is null and round >= v_from;

  return n + (select count(*) from match_results
               where session_id = t.session_id and team_b_id = p_team_id
                 and winner is null and round >= v_from);
end;
$$;

revoke all on function substitute_team_player (uuid, uuid, uuid, integer) from public, anon;
grant execute on function substitute_team_player (uuid, uuid, uuid, integer) to authenticated;
