-- Verification harness for delete_game_day / restore_game_day (TASK-91).
--
-- There is no pgTAP harness in this project and no CI job that runs SQL tests,
-- so this is a self-contained script rather than a suite. It creates its own
-- game day, exercises every branch of the guard and the restore, and ends by
-- raising ROLLBACK_SENTINEL so the whole thing is discarded. Nothing it touches
-- is committed, but run it against dev rather than prod all the same.
--
-- How to run:
--   psql "$DEV_DATABASE_URL" -f supabase/tests/archive_restore_game_day.sql
-- or paste it into the SQL editor of a non-production project. Success looks
-- like PASS lines for every check, then ALL CHECKS PASSED, then the sentinel
-- error. Any FAIL line, or a missing PASS, is a real regression.
--
-- It impersonates a real matchmaker via request.jwt.claims because is_admin()
-- and is_matchmaker() both read auth.uid(), which is null on a direct
-- connection — without this every call would raise insufficient_privilege.
do $$
declare
  v_club     uuid;
  v_uid      uuid;
  v_sess     uuid := gen_random_uuid ();
  v_sess2    uuid := gen_random_uuid ();
  v_players  uuid[];
  v_n        integer;
  v_arch     integer;
  v_scored   integer;
  v_restored integer;
  v_before   jsonb;
  v_after    jsonb;
  v_err      text;
  v_sess3    uuid := gen_random_uuid ();
  v_team_a   uuid := gen_random_uuid ();
  v_team_b   uuid := gen_random_uuid ();
  v_teams    integer;
begin
  select pp.club_id, pp.user_id into v_club, v_uid
  from player_profiles pp
  where pp.is_matchmaker and pp.user_id is not null
  limit 1;
  if v_uid is null then
    raise exception 'no matchmaker with a user_id here — cannot verify';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid)::text, true);
  raise notice 'acting as % in club %', v_uid, v_club;

  select array_agg(id) into v_players
  from (select id from player_profiles where club_id = v_club limit 4) q;

  -- A day with one scored match and one unscored.
  insert into match_sessions (id, club_id, status, mode, rounds, played_at, kind, hidden)
  values (v_sess, v_club, 'finished', 'open', 2, now(), 'casual', false);
  insert into match_results (club_id, session_id, round, court, team_a1, team_a2, team_b1, team_b2, winner, score_a, score_b)
  values (v_club, v_sess, 1, 1, v_players[1], v_players[2], v_players[3], v_players[4], 'a', 21, 15);
  insert into match_results (club_id, session_id, round, court, team_a1, team_a2, team_b1, team_b2)
  values (v_club, v_sess, 2, 1, v_players[1], v_players[3], v_players[2], v_players[4]);
  insert into session_attendance (session_id, player_id, club_id, present)
  select v_sess, unnest(v_players), v_club, true;

  select jsonb_agg(to_jsonb (r) order by r.round) into v_before
  from match_results r where r.session_id = v_sess;

  -- 1. scored day, no force -> must refuse, and must not touch the day
  begin
    v_n := delete_game_day (v_sess);
    raise exception 'FAIL 1: scored day deleted without force';
  exception when sqlstate 'PT409' then
    get stacked diagnostics v_err = message_text;
    raise notice 'PASS 1 refused: %', v_err;
  end;
  if not exists (select 1 from match_sessions where id = v_sess) then
    raise exception 'FAIL 1b: session vanished on a refused delete';
  end if;
  if exists (select 1 from deleted_game_days where session_id = v_sess) then
    raise exception 'FAIL 1c: refused delete still archived the day';
  end if;

  -- 2. scored day, forced -> archived and gone
  v_n := delete_game_day (v_sess, true);
  if exists (select 1 from match_sessions where id = v_sess) then
    raise exception 'FAIL 2: session still live after forced delete';
  end if;
  select scored_matches, total_matches into v_scored, v_arch
  from deleted_game_days where session_id = v_sess;
  if v_arch is null then
    raise exception 'FAIL 2b: nothing archived';
  end if;
  if v_scored <> 1 or v_arch <> 2 then
    raise exception 'FAIL 2c: archive counts wrong — % scored of %', v_scored, v_arch;
  end if;
  if exists (select 1 from match_results where session_id = v_sess) then
    raise exception 'FAIL 2d: match_results survived the delete';
  end if;
  raise notice 'PASS 2 archived: % matches, % scored', v_arch, v_scored;

  -- 3. restore -> identical rows back, archive consumed
  v_restored := restore_game_day (v_sess);
  select jsonb_agg(to_jsonb (r) order by r.round) into v_after
  from match_results r where r.session_id = v_sess;
  if v_before is distinct from v_after then
    raise exception 'FAIL 3: restored rows differ%',
      E'\nbefore: ' || v_before || E'\nafter:  ' || v_after;
  end if;
  if (select count(*) from session_attendance where session_id = v_sess)
     <> array_length(v_players, 1) then
    raise exception 'FAIL 3b: attendance not restored';
  end if;
  if exists (select 1 from deleted_game_days where session_id = v_sess) then
    raise exception 'FAIL 3c: archive row left behind after restore';
  end if;
  raise notice 'PASS 3 restored % matches, rows identical', v_restored;

  -- 4. restoring onto a live day must refuse rather than merge two evenings
  --    under one id. Archive it again, then put a different day in its place.
  v_n := delete_game_day (v_sess, true);
  insert into match_sessions (id, club_id, status, mode, rounds, played_at, kind, hidden)
  values (v_sess, v_club, 'live', 'open', 1, now(), 'casual', false);
  begin
    v_n := restore_game_day (v_sess);
    raise exception 'FAIL 4: restored over a live session';
  exception when sqlstate 'PT409' then
    raise notice 'PASS 4 refused to restore over a live session';
  end;
  if not exists (select 1 from deleted_game_days where session_id = v_sess) then
    raise exception 'FAIL 4b: refused restore consumed the archive anyway';
  end if;

  -- 5. an unknown id is a clean not-found, not a crash
  begin
    v_n := restore_game_day (gen_random_uuid ());
    raise exception 'FAIL 5: restored a day that was never archived';
  exception when sqlstate 'PT404' then
    raise notice 'PASS 5 unknown id refused as not-found';
  end;

  -- 6. unscored day -> deletes with no force. This is the restart flow and must
  --    stay as cheap as it was.
  insert into match_sessions (id, club_id, status, mode, rounds, played_at, kind, hidden)
  values (v_sess2, v_club, 'live', 'open', 1, now(), 'casual', false);
  insert into match_results (club_id, session_id, round, court)
  values (v_club, v_sess2, 1, 1);
  v_n := delete_game_day (v_sess2);
  if exists (select 1 from match_sessions where id = v_sess2) then
    raise exception 'FAIL 6: unscored day not deleted';
  end if;
  if not exists (select 1 from deleted_game_days where session_id = v_sess2) then
    raise exception 'FAIL 6b: unscored day deleted without being archived';
  end if;
  raise notice 'PASS 6 unscored day deleted without force, still archived';

  -- 7. a FIXED-PAIRS day round-trips. This is the case the original harness
  --    missed: match_results.team_a_id/team_b_id are foreign keys to
  --    tournament_teams, so restoring in the wrong order dies on
  --    match_results_team_a_id_fkey. On a casual day those columns are null and
  --    any order passes, which is exactly why it went unnoticed.
  insert into match_sessions (id, club_id, status, mode, rounds, played_at, kind, hidden)
  values (v_sess3, v_club, 'finished', 'open', 1, now(), 'tournament', false);
  insert into tournament_teams (id, club_id, session_id, player1_id, player2_id)
  values (v_team_a, v_club, v_sess3, v_players[1], v_players[2]),
         (v_team_b, v_club, v_sess3, v_players[3], v_players[4]);
  insert into match_results (
    club_id, session_id, round, court,
    team_a1, team_a2, team_b1, team_b2, team_a_id, team_b_id, winner, score_a, score_b)
  values (
    v_club, v_sess3, 1, 1,
    v_players[1], v_players[2], v_players[3], v_players[4], v_team_a, v_team_b, 'a', 21, 18);

  select jsonb_agg(to_jsonb (r)) into v_before
  from match_results r where r.session_id = v_sess3;

  v_n := delete_game_day (v_sess3, true);
  if exists (select 1 from tournament_teams where session_id = v_sess3) then
    raise exception 'FAIL 7: tournament_teams survived the delete';
  end if;

  v_restored := restore_game_day (v_sess3);

  select count(*) into v_teams from tournament_teams where session_id = v_sess3;
  if v_teams <> 2 then
    raise exception 'FAIL 7b: % teams restored, expected 2', v_teams;
  end if;

  select jsonb_agg(to_jsonb (r)) into v_after
  from match_results r where r.session_id = v_sess3;
  if v_before is distinct from v_after then
    raise exception 'FAIL 7c: restored tournament rows differ%',
      E'\nbefore: ' || v_before || E'\nafter:  ' || v_after;
  end if;
  if not exists (
    select 1 from match_results
    where session_id = v_sess3 and team_a_id = v_team_a and team_b_id = v_team_b
  ) then
    raise exception 'FAIL 7d: restored matches lost their team ids';
  end if;
  raise notice 'PASS 7 fixed-pairs day round-tripped with its % teams intact', v_teams;

  raise notice 'ALL CHECKS PASSED';
  raise exception 'ROLLBACK_SENTINEL: verification complete, discarding all changes';
end $$;
