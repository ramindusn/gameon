-- 20260623000000_tournament_kind.sql — E11 fixed-pairs tournaments (TASK-12.1).
-- Adds a session "kind" so a game day can be either a normal casual session
-- (default) or a fixed-pairs tournament. Tournament play is deliberately ISOLATED
-- from the individual + per-pair Glicko boards: the recompute-ratings Edge
-- Function skips kind='tournament' sessions, and tournament standings are a
-- separate, points-based leaderboard computed on read from match_results.
--
-- No RLS change: match_sessions already grants public read + admin/matchmaker
-- writes within the club (20260622140000_match_sessions_results.sql), which
-- covers tournament sessions and their result rows too.

alter table match_sessions
  add column kind text not null default 'casual'
    check (kind in ('casual', 'tournament'));

-- Standings/recompute queries filter finished sessions by kind.
create index match_sessions_kind_idx on match_sessions (club_id, kind);
