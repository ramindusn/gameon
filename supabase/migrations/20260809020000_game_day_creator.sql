-- 20260809020000_game_day_creator.sql — record who created a game day
-- (TASK-86).
--
-- match_sessions.created_by has been there since the beginning and is null on
-- every row: nothing ever wrote it, and the client never selected it back.
--
-- Setting it from the client would cover the one insert that exists today and
-- rely on whoever writes the next one remembering. A column default covers
-- every path — the app's insert, a future one, anything run by hand in the SQL
-- editor while signed in — and cannot be forgotten at a call site.
--
-- auth.uid() is null for a service-role or superuser connection, so a seed or a
-- migration writing sessions still leaves it null rather than attributing them
-- to somebody. That is the right answer: nobody created those.
--
-- Existing rows stay null on purpose. There is nothing to backfill them from —
-- match_results and session_attendance carry no creator either — and guessing
-- would put a name against a game day that person may not have started.
alter table match_sessions
  alter column created_by set default auth.uid ();
