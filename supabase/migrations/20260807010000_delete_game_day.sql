-- 20260807010000_delete_game_day.sql — deleting a game day gives its shuttles
-- back (TASK-81).
--
-- usage_entries.session_id is ON DELETE SET NULL, and deleteSession only removed
-- the match_sessions row. So deleting a game day that had usage recorded left
-- the entry behind with no day attached: the holder stayed short, the club stock
-- stayed down, and the shuttles kept counting against the fund as usage income
-- for a day that no longer existed.
--
-- Deleting a day is how a mistake is undone — a duplicate, a wrong date, a test.
-- If the day did not happen, the shuttles were not used. So the usage goes back
-- the same way TASK-77 made a deleted usage entry go back: the holder is
-- credited and the reversal is logged, then the entry is removed.
--
-- One function so it cannot half-happen. Deleting the session first and failing
-- on the credit would lose the link to what needed reversing.
create or replace function delete_game_day (p_session_id uuid)
  returns integer
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_club uuid;
  e      record;
  n      integer := 0;
begin
  select club_id into v_club from match_sessions where id = p_session_id;
  if v_club is null then
    return 0; -- already gone
  end if;

  if not (is_admin (v_club) or is_matchmaker (v_club)) then
    raise exception 'Only a matchmaker or an admin can delete a game day'
      using errcode = 'insufficient_privilege';
  end if;

  -- Give back what each entry took, then drop it. usage_items cascade with the
  -- entry, and restore_usage_holdings writes the audit row for the credit.
  for e in select id from usage_entries where session_id = p_session_id loop
    perform restore_usage_holdings (e.id);
    delete from usage_entries where id = e.id;
    n := n + 1;
  end loop;

  -- match_results and session_attendance cascade with the session.
  delete from match_sessions where id = p_session_id;

  return n;
end;
$$;

revoke all on function delete_game_day (uuid) from public, anon;
grant execute on function delete_game_day (uuid) to authenticated;
