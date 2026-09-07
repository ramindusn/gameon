-- 20260907090000_court_numbers.sql — optional real court numbers (TASK-99).
--
-- match_results.court stays what it has always been: the positional court slot
-- within a round (1..N), which the unique (session_id, round, court) index and
-- the add-match "next free court" logic both depend on.
--
-- What is new is a per-game-day LABEL for those slots. A club playing on the
-- venue's courts 5, 6 and 9 could only ever see "Court 1/2/3"; now the
-- matchmaker can name the real courts once, when generating the draw, and slot
-- i is displayed as court_numbers[i].
--
-- Null (the default, and every existing row) means "no list given" — courts are
-- displayed by their slot number exactly as before. Nothing backfills this.

alter table match_sessions
  add column court_numbers smallint[];

comment on column match_sessions.court_numbers is
  'Optional real court numbers, indexed by match_results.court (1-based slot). Null = number courts by their slot, the pre-TASK-99 behaviour.';
