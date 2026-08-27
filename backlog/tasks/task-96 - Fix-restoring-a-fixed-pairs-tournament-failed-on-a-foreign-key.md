---
id: TASK-96
title: 'Fix: restoring a fixed-pairs tournament failed on a foreign key'
status: Done
assignee: []
created_date: '2026-08-27 16:31'
updated_date: '2026-08-27 16:31'
labels: []
dependencies: []
priority: high
ordinal: 162000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
restore_game_day() re-inserted the archived children in the order match_results, tournament_teams, session_attendance. That is wrong: match_results has two parents, not one - session_id references match_sessions, and team_a_id/team_b_id reference tournament_teams. Restoring a fixed-pairs day therefore died with 23503 match_results_team_a_id_fkey, leaving the archive intact but the day unrestorable.

On a casual day team_a_id and team_b_id are null, so any order works. The TASK-91 harness only ever built a casual day, so all six checks passed and the bug shipped to prod. It surfaced the first time a real tournament day was restored on dev.

Fix: insert tournament_teams between the session and the matches, and extend the harness to round-trip a fixed-pairs day with real team ids.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Restoring a fixed-pairs tournament day succeeds, with its tournament_teams and the matches' team_a_id/team_b_id intact
- [x] #2 Restoring a casual day still works exactly as before
- [x] #3 The verification harness covers a fixed-pairs round trip, so this cannot regress unnoticed
- [ ] #4 Applied to dev and prod
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: match_results has two foreign key parents, and restore_game_day() only accounted for one. The comment in the original said 'Parent first, then children', which was true of session_id and hid the fact that team_a_id/team_b_id point somewhere else entirely.

Why the tests missed it: the TASK-91 harness built its fixture as a casual day, where team_a_id and team_b_id are null, so the insert order was never exercised. Six checks passed against a case that could not fail. The harness now builds a fixed-pairs day with real tournament_teams rows and asserts the team ids survive the round trip.

Also worth noting for future work: the original verification ran as the migration connection (postgres, which owns the tables and bypasses RLS). The real client is the authenticated role. Reproducing the failure needed 'set local role authenticated' - worth doing whenever a security-definer function is being verified, since postgres succeeding proves less than it appears to.

Verified on dev: the extended harness passes all 7 checks and rolls back, and the actual archived tournament day (f2bcb54a, 3 matches) restores as authenticated.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
restore_game_day() now inserts tournament_teams between the session and the matches, so a fixed-pairs day restores instead of failing on match_results_team_a_id_fkey. Migration 20260827030000; no client change. The harness gained a fixed-pairs round trip asserting the team ids survive, which is the check whose absence let this ship.
<!-- SECTION:FINAL_SUMMARY:END -->
