---
id: TASK-10.4
title: 'Live line-up editing, custom matches, and delete match'
status: Done
assignee:
  - '@me'
created_date: '2026-06-22 20:39'
updated_date: '2026-06-22 21:07'
labels:
  - E09
  - 'size:M'
dependencies:
  - TASK-10.1
parent_task_id: TASK-10
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Let the matchmaker adjust a live game day's matches. Add play data-layer ops: updateMatchLineup(resultId, teamA[2], teamB[2]) for full substitution from the present roster (covers partner swaps like AB vs CD -> AC vs BD and substituting a different player); addCustomMatch(sessionId, players) to insert an ad-hoc match when the draw runs low; deleteMatch(resultId) to drop a match that won't be played. PlayPage UI exposes editing a match's four slots (pick from present roster), adding a custom match, and deleting a match. All edits are blocked once the game day is finished. Validate that a player cannot appear twice in the same match.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 On a live game day the matchmaker can replace any of a match's four players with any present player (partner swap or full substitution)
- [x] #2 The matchmaker can add a custom/ad-hoc match by choosing four players when the draw runs low
- [x] #3 The matchmaker can delete a match (e.g. one that will not be played)
- [x] #4 Editing, adding, and deleting matches is blocked once the game day is finished
- [x] #5 A player cannot appear twice in the same match (validation with a clear message)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Domain: NEW packages/domain/src/matches/lineup.ts — pure validateLineup(ids: (string|null)[]) requiring 4 present ids with no duplicate player ({ok,error}); export + unit tests.
2. Data layer (play/api.ts): updateMatchLineup(resultId, teamA[2], teamB[2]) — writes team_*; resets score_a/score_b/winner to null (old score belongs to old players). addCustomMatch(clubId, sessionId, round, court, players[4]) — insert one match_results row. deleteMatch(resultId) — delete row. e2e branches: e2eUpdateLineup/e2eAddMatch/e2eDeleteMatch in e2eStore.ts.
3. Hooks (useMatchPlay.ts): useUpdateMatchLineup/useAddCustomMatch/useDeleteMatch, all invalidate sessionKey.
4. PlayPage UI (live only): per-match 'Edit line-up' toggle with 4 selects from present (non-absent) roster + Save/Cancel + inline dup error; 'Delete match' (two-step confirm); 'Add custom match' form (4 selects) appended after rounds, assigns round=maxRound/court=maxCourt+1. All hidden/disabled when finished.
5. Tests: domain lineup.test.ts; PlayPage.test.tsx (edit lineup, dup rejection, add, delete, finished-blocks-edit); e2e play.spec.ts flow (edit line-up + add custom + delete on live game day). Run lint+build+unit+e2e.
6. Finalize: check AC 1-5, notes, final-summary, Done; commit on feat/gameday, ff-merge main + push.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented live line-up editing, custom matches, and delete-match (E09 / TASK-10.4).

Domain: NEW packages/domain/src/matches/lineup.ts — pure validateLineup(ids) requiring exactly 4 filled, distinct slots ({ok,error}); exported; 5 unit tests in lineup.test.ts.

Data layer (apps/badminton/src/play/api.ts): updateMatchLineup(resultId, teamA[2], teamB[2]) writes team_* AND clears score_a/score_b/winner (old score belonged to old line-up — must re-score); addCustomMatch(clubId, sessionId, round, court, players[4]) inserts one match_results row; deleteMatch(resultId) deletes one row. e2eStore: e2eUpdateLineup/e2eAddMatch/e2eDeleteMatch.

Hooks (useMatchPlay.ts): useUpdateMatchLineup/useAddCustomMatch/useDeleteMatch, all invalidate sessionKey.

UI (PlayPage, live only): per-court 'Edit line-up' toggles a LineupEditor with 4 PlayerSelects over the present (non-absent) roster + inline duplicate error (validateLineup); 'Delete match' two-step confirm; AddCustomMatch card after the rounds with 4 selects + validation, assigning round/court via nextSlot() = last round / next free court. All editing controls (edit-lineup, delete-match, add-custom-match, save-score) are hidden once status==='finished' (gated on live). Score inputs disabled when not live.

Validation: lint clean; badminton build green; unit 113 passed (incl. lineup.test.ts + PlayPage editing/dup/finished-hides tests); e2e 42 passed (NEW flow: edit line-up -> add custom match -> delete match on a live game day). deno not installed locally — Edge Function unaffected by this task (no recompute change).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added live game-day editing: full line-up substitution (4 selects from the present roster, clears stale score), ad-hoc custom matches, and per-match delete — all gated to live game days with duplicate-player validation. New pure validateLineup helper. Verified with lint, build, 113 unit tests, and 42 e2e tests.
<!-- SECTION:FINAL_SUMMARY:END -->
