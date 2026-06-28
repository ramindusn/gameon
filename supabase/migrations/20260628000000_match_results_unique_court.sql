-- A session can hold at most one match per (round, court). Generated draws and
-- tournament fixtures already assign distinct courts within a round; this also
-- stops a racing "Add custom match" (slot computed client-side from possibly
-- stale data) from creating two rows in the same round/court. (TASK-28)
create unique index if not exists match_results_session_round_court_key
  on public.match_results (session_id, round, court);
