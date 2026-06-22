-- 20260622170000_game_day.sql — E09 game-day management (TASK-10.1).
-- Promotes a live "session" into a managed "game day": it gains an editable
-- date/time (played_at) the matchmaker chooses when creating it (defaulting to
-- "now") and can adjust afterwards, distinct from the immutable created_at audit
-- stamp. Point scores (score_a/score_b) already exist on match_results from the
-- ranking migration; live line-up edits, custom matches, and match deletion are
-- already covered by the E04 admin/matchmaker insert/update/delete policies on
-- match_results (verified, see comment below) — no policy change needed here.

-- ---------------------------------------------------------------------------
-- match_sessions.played_at — the game-day date/time (editable by the matchmaker).
-- Backfill existing rows to their created_at so history keeps its real date,
-- then enforce NOT NULL with a now() default for new game days.
-- ---------------------------------------------------------------------------
alter table match_sessions
  add column played_at timestamptz;

update match_sessions
  set played_at = created_at
  where played_at is null;

alter table match_sessions
  alter column played_at set not null,
  alter column played_at set default now();

-- Sessions list orders by the game-day date/time.
create index match_sessions_played_at_idx on match_sessions (played_at desc);

-- ---------------------------------------------------------------------------
-- RLS note (no change): E04's match_sessions / match_results policies already
-- grant admins and matchmakers of the club full insert/update/delete, which
-- covers editing played_at, editing/deleting a game day, and live line-up edits,
-- custom matches, and match deletion. Re-stating here for traceability; the
-- policies live in 20260622140000_match_sessions_results.sql.
-- ---------------------------------------------------------------------------
