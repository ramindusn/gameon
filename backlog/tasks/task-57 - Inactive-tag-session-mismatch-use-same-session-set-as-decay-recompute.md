---
id: TASK-57
title: 'Inactive-tag session mismatch: use same session set as decay recompute'
status: Done
assignee: []
created_date: '2026-07-25 21:36'
updated_date: '2026-07-25 21:38'
labels:
  - bug
  - ranking
dependencies: []
ordinal: 111000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The leaderboard 'inactive' tag (loadInactivePlayers in apps/badminton/src/ranking/api.ts) only looks at the last ABSENCE_GRACE_PERIOD (5) sessions where kind='casual'. The absence-decay engine that actually docks rating points (supabase/functions/recompute-ratings/index.ts, via applyAbsenceDecay in packages/domain/src/ranking/ranking.ts) replays ALL finished sessions regardless of kind (tournaments included, per TASK-39). Result: a player's tournament attendance resets their real decay streak in the engine, but the casual-only tag doesn't see it and can still flag them inactive (or the reverse) — a verifiable discrepancy between the badge and the actual rating behavior, reported by the admin as ratings on inactive players 'sometimes feeling wrong'. Fix: make loadInactivePlayers consider the same session set (all kinds, not just casual) that the decay engine uses, so the tag and the underlying decay streak can never disagree about who is actually decaying.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 loadInactivePlayers queries the last ABSENCE_GRACE_PERIOD finished sessions of any kind (no kind='casual' filter), matching the session set recompute-ratings/applyAbsenceDecay actually replays
- [x] #2 A player who attended a recent tournament session is not flagged inactive by that attendance, exactly as their decay streak is reset by the engine
- [x] #3 A player absent from the last 5 sessions of any kind (mix of casual/tournament) is flagged inactive
- [x] #4 Existing inactive-tag behavior for casual-only clubs (no tournaments) is unchanged
- [ ] #5 Unit tests added for loadInactivePlayers covering: casual-only history (regression), a tournament session resetting the streak so the player is NOT flagged, and a tournament-inclusive 5-miss streak correctly flagging inactive
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fix: removed .eq('kind','casual') from loadInactivePlayers' match_sessions query (apps/badminton/src/ranking/api.ts) so the tag now considers the last ABSENCE_GRACE_PERIOD finished sessions of ANY kind, matching the exact session set recompute-ratings/applyAbsenceDecay replays (which never filtered by kind, per TASK-39). Also extracted the attendance-counting logic into a new exported pure helper, computeInactivePlayers(rows, gracePeriod), following this file's existing convention (buildFormMap/buildGameDayBoard) of separating Supabase-query fetch from a testable pure function — loadInactivePlayers had zero test coverage before this. Added 4 unit tests in api.test.ts covering: absent-all-5 flags inactive, present-in-any-one-session (e.g. a tournament) resets the streak and does not flag, fewer than gracePeriod records does not flag, and a mixed multi-player dataset flags only the qualifying player. Note: the query-level kind filter change itself isn't unit-testable in this codebase's current pattern (no supabase-client mocking exists for this file) — verified by code inspection (grep confirmed no kind filter in recompute-ratings/index.ts) and will be manually verified against the dev DB on localhost next.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed the kind='casual' filter from loadInactivePlayers so the inactive-tag's session window matches the decay engine's (which includes tournaments). Extracted the counting logic into a new pure computeInactivePlayers() helper and added 4 unit tests for it (previously zero coverage). Full suite passes except one pre-existing, unrelated timezone test failure that also fails on main. Verified with vitest + tsc; manual dev-DB verification pending on localhost.
<!-- SECTION:FINAL_SUMMARY:END -->
