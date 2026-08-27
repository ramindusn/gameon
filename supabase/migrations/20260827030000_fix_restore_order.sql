-- 20260827030000_fix_restore_order.sql — restoring a fixed-pairs tournament
-- failed on a foreign key (TASK-91 follow-up).
--
-- restore_game_day() re-inserted the children as: match_results,
-- tournament_teams, session_attendance. That reads as "parent first, then
-- children", and it is wrong, because match_results has TWO parents:
--
--   match_results.session_id  -> match_sessions
--   match_results.team_a_id   -> tournament_teams
--   match_results.team_b_id   -> tournament_teams
--
-- On a casual day team_a_id and team_b_id are null, so the order never
-- mattered and every test passed. On a fixed-pairs tournament they point at
-- rows that had not been inserted yet, and the restore died with
--
--   23503: insert or update on table "match_results" violates foreign key
--   constraint "match_results_team_a_id_fkey"
--
-- leaving the archive intact but the day unrestorable — the one case the
-- archive exists for, failing on the one kind of day that carries teams.
--
-- tournament_teams now goes in between: after the session it belongs to, before
-- the matches that reference it.
create or replace function restore_game_day (p_session_id uuid)
  returns integer
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_row      deleted_game_days%rowtype;
  v_restored integer := 0;
begin
  select * into v_row from deleted_game_days where session_id = p_session_id;
  if v_row.session_id is null then
    raise exception 'No archived game day with id %', p_session_id
      using errcode = 'PT404';
  end if;

  if not (is_admin (v_row.club_id) or is_matchmaker (v_row.club_id)) then
    raise exception 'Only a matchmaker or an admin can restore a game day'
      using errcode = 'insufficient_privilege';
  end if;

  -- Refuse rather than merge. If a live day already holds this id then the id
  -- was reused, and writing the archived children underneath it would silently
  -- mix two different evenings together.
  if exists (select 1 from match_sessions where id = p_session_id) then
    raise exception 'Game day % already exists — restore would collide with it',
      p_session_id
      using errcode = 'PT409';
  end if;

  -- In foreign key order: the session, then the teams, then the matches that
  -- reference both, then attendance. jsonb_populate_recordset maps by column
  -- name, so a column added to a live table since the archive was written
  -- simply takes its default here.
  insert into match_sessions
  select * from jsonb_populate_record (null::match_sessions, v_row.payload -> 'session');

  insert into tournament_teams
  select * from jsonb_populate_recordset (null::tournament_teams, v_row.payload -> 'tournament_teams');

  insert into match_results
  select * from jsonb_populate_recordset (null::match_results, v_row.payload -> 'match_results');
  get diagnostics v_restored = row_count;

  insert into session_attendance
  select * from jsonb_populate_recordset (null::session_attendance, v_row.payload -> 'session_attendance');

  -- The day is live again, so the archive copy would only ever go stale.
  delete from deleted_game_days where session_id = p_session_id;

  return v_restored;
end;
$$;

revoke all on function restore_game_day (uuid) from public, anon;
grant execute on function restore_game_day (uuid) to authenticated;
