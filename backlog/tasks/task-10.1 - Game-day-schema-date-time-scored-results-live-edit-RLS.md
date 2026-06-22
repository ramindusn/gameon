---
id: TASK-10.1
title: 'Game-day schema: date/time + scored results + live-edit RLS'
status: Done
assignee:
  - '@me'
created_date: '2026-06-22 20:39'
updated_date: '2026-06-22 20:44'
labels:
  - E09
  - 'size:S'
dependencies: []
parent_task_id: TASK-10
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Foundation for E09. Add an editable game-day date/time to match_sessions and make sure the matchmaker/admin can fully edit a live game day's matches at the DB layer. Migration: add played_at timestamptz not null default now() to match_sessions (the game-day date/time, distinct from created_at). Verify/extend RLS so admin/matchmaker can insert, update, and delete match_results, and update/delete match_sessions for their club (the existing E04 policies already grant authenticated writes guarded by is_admin/is_matchmaker — confirm and document, add anything missing). The score_a/score_b columns already exist (ranking migration). Regenerate packages/supabase database.types.ts and confirm supabase db reset applies cleanly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 match_sessions has an editable played_at column (game-day date/time) defaulting to now()
- [x] #2 Admin/matchmaker can insert, update, and delete match_results rows for their club (RLS verified)
- [x] #3 Admin/matchmaker can update (incl. played_at) and delete a match_sessions row for their club (RLS verified)
- [x] #4 database.types.ts regenerated and supabase db reset applies all migrations cleanly
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Schema foundation for E09.

Migration 20260622170000_game_day.sql:
- Adds match_sessions.played_at timestamptz: added nullable, backfilled existing rows to created_at (so historical game days keep their real date), then set NOT NULL DEFAULT now(). This is the editable game-day date/time, distinct from the immutable created_at audit stamp.
- Adds index match_sessions_played_at_idx (played_at desc) for the sessions list ordering.
- No RLS change: verified E04's match_sessions/match_results policies already grant admins+matchmakers of the club full INSERT/UPDATE/DELETE (covers editing played_at, editing/deleting a game day, and live line-up edits / custom matches / match deletion). Restated as a comment for traceability. score_a/score_b already exist from the ranking migration.

Verification (local supabase):
- supabase db reset applies all 15 migrations cleanly incl. the new one.
- \d match_sessions shows played_at NOT NULL default now() + the desc index.
- pg_policies confirms all 4 CRUD policies on both match_sessions and match_results (public SELECT + matchmaker/admin INSERT/UPDATE/DELETE).
- Regenerated packages/supabase/src/database.types.ts (played_at on match_sessions Row/Insert/Update; score_a/score_b on match_results).
- build clean, lint clean, 94 unit tests pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added an editable game-day date/time (match_sessions.played_at, NOT NULL default now(), backfilled to created_at for existing rows) plus a played_at desc index, in migration 20260622170000_game_day.sql. Confirmed the existing E04 RLS already lets matchmakers/admins insert/update/delete match_results and update/delete match_sessions (live line-up edits, custom matches, deletion, and game-day edit/delete need no new policy). Regenerated database.types.ts; supabase db reset is clean; build/lint/94 unit tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
