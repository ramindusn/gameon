---
id: TASK-10.3
title: Point-score entry per match (winner derived from scores)
status: To Do
assignee: []
created_date: '2026-06-22 20:39'
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
- [ ] #1 The matchmaker enters each team's points for a match and the winning side is derived from the scores
- [ ] #2 Scores persist to match_results.score_a/score_b and the derived winner
- [ ] #3 Invalid scores (negative, or an equal/tie score) are rejected with a clear message
- [ ] #4 A match's score can be corrected while the game day is live
- [ ] #5 The ranking recompute uses the point margin from the recorded scores
<!-- AC:END -->
