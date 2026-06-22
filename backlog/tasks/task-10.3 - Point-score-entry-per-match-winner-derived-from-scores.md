---
id: TASK-10.3
title: Point-score entry per match (winner derived from scores)
status: Done
assignee:
  - '@me'
created_date: '2026-06-22 20:39'
updated_date: '2026-06-22 21:00'
labels:
  - E09
  - 'size:M'
dependencies:
  - TASK-10.1
parent_task_id: TASK-10
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Record real point scores per match instead of only the winning side. Add a pure domain helper deriveWinner(scoreA, scoreB) (and shared validation). The play data layer writes match_results.score_a/score_b plus the derived winner. PlayPage UI lets the matchmaker enter both teams' points for each match; the winner is computed and shown. Scores can be corrected while the game day is live. The ranking recompute already consumes score_a/score_b (point margin) — verify it now uses the written scores.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The matchmaker enters each team's points for a match and the winning side is derived from the scores
- [x] #2 Scores persist to match_results.score_a/score_b and the derived winner
- [x] #3 Invalid scores (negative, or an equal/tie score) are rejected with a clear message
- [x] #4 A match's score can be corrected while the game day is live
- [x] #5 The ranking recompute uses the point margin from the recorded scores
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented point-score entry (E09 / TASK-10.3).

Domain: NEW packages/domain/src/matches/score.ts — pure validateScores(a,b) (both present, integer, >=0, not tied) + deriveWinner(a,b) ('a' if a>b else 'b'; null if invalid) + Side type; exported from index.ts. 7 unit tests in score.test.ts.

Data layer (apps/badminton/src/play): MatchResult now carries scoreA/scoreB (number|null); mapResultRow + RESULT_COLS include score_a/score_b. Replaced setResult(winner) with setScore(resultId, scoreA, scoreB) — derives winner via deriveWinner, throws on invalid, writes {score_a, score_b, winner}. e2eStore: e2eSetResult->e2eSetScore + e2ePut seeds scoreA/scoreB null. Hook useSetResult->useSetScore in useMatchPlay.ts.

UI: PlayPage CourtScore rewritten from winner-tap buttons to two numeric score inputs per match (testids score-<id>-a/-b) + Save/Update score button (save-score-<id>) with inline validation error (score-error-<id>); winner highlighted (checkmark) from derived winner; editable while live (Update score). Recorded count still keyed on winner!=null.

Recompute (AC#5): supabase/functions/recompute-ratings/index.ts already SELECTs score_a/score_b and uses them as the point margin (toMatchRecord) — verified; app now writes real scores so the margin is meaningful.

Validation: lint clean; badminton build (tsc+vite) green; unit 103 passed (incl. score.test.ts + updated PlayPage.test.tsx score-entry + tie-rejection); e2e 40 passed (play.spec updated to enter scores instead of tapping winner). deno not installed locally so Edge Function runtime untested — deferred to deploy.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added per-match point-score entry: pure deriveWinner/validateScores domain helpers, play data layer writes match_results.score_a/score_b + derived winner, and PlayPage scores each court via two inputs with inline validation and live correction. Recompute already consumes the point margin. Verified with lint, build, 103 unit tests, and 40 e2e tests.
<!-- SECTION:FINAL_SUMMARY:END -->
