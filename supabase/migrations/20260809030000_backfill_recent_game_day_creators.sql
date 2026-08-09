-- 20260809030000_backfill_recent_game_day_creators.sql — name Sahan as the
-- creator of the three most recent game days (TASK-86).
--
-- The previous migration only fixes the future: created_by defaults to
-- auth.uid() from now on. Nothing in the database can say who started the game
-- days already there — match_results and session_attendance carry no creator
-- either — so those would stay blank forever.
--
-- Three of them do not have to. Ramindu says the last three game days,
-- including the one live on 9 August, were created by Sahan. That is a fact
-- from the person who runs the club, not an inference, so it is safe to record;
-- the rest stay null because nobody has said who started them, and a guess
-- would put a name against someone else's game day.
--
-- Scoped to the three session ids rather than "the newest three", so re-running
-- it later cannot walk forward onto game days it was never meant to touch. It
-- only fills blanks: a session that has since been attributed is left alone.
update match_sessions
   set created_by = (
         select user_id from player_profiles
          where nickname = 'Sahan' and user_id is not null
          limit 1
       )
 where id in (
         'd64c922d-da48-4674-8aef-6c5b23784b38', -- 2026-08-09, live at the time
         '17af3673-5127-4816-96d1-29e9fb66da2e', -- 2026-07-26
         '5e445a7f-05ec-492e-bd4c-7a77a2c13fd3'  -- 2026-07-22
       )
   and created_by is null
   and exists (
         select 1 from player_profiles
          where nickname = 'Sahan' and user_id is not null
       );
