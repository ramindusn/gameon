---
id: TASK-36
title: 'Absence decay: add a 5-game-day grace period before points drop'
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-07-09 08:50'
updated_date: '2026-07-09 08:53'
labels:
  - ranking
  - domain
dependencies: []
priority: medium
ordinal: 90000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currently every missed game day docks a rated player ABSENCE_DECAY (−20) points (ADR 0011, TASK-6.5). The club plays 2 game days/week, so a normal 2–3 week break (holiday/injury) can cost −40 to −80+, which over-penalises real skill and fights Glicko-2's design (inactivity should raise RD, not lower rating). Add a grace period: a player may miss up to 5 CONSECUTIVE game days with no rating penalty; decay only starts on the 6th consecutive miss and each missed game day after, and playing any scored match resets the streak. Keep the existing −20 magnitude and 1500 floor; keep RD inflation and the 'inactive' tag unchanged. Implemented in packages/domain/src/ranking/ranking.ts (computeRatings now tracks a per-player consecutive-absence streak). Update ADR 0011 and the domain tests.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A rated player missing 1–5 consecutive game days loses no rating points
- [x] #2 From the 6th consecutive missed game day on, each missed game day docks ABSENCE_DECAY, floored at ABSENCE_FLOOR (1500)
- [x] #3 Playing any scored match resets the consecutive-absence streak
- [x] #4 RD inflation, the pairs board (no decay), and the 'inactive' tag behaviour are unchanged
- [x] #5 ADR 0011 and packages/domain/src/ranking tests updated; npm run verify green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented in packages/domain/src/ranking/ranking.ts: computeRatings now carries a per-player consecutiveAbsence streak across periods; applyAbsenceDecay(ratings, absentees, played, streak) resets the streak for anyone who played, increments it for absentees, skips decay while missed <= ABSENCE_GRACE_PERIOD (5), and applies the existing -20 (floored at 1500) from the 6th consecutive miss on. Added ABSENCE_GRACE_PERIOD=5 constant. No schema/backend change — grace is derived in the full replay from existing session_attendance, so past game days recompute under the new rule automatically. RD inflation, pairs board (no decay), and the inactive tag are unchanged. Updated ADR 0011, types.ts + E2E-seed comments, and the ranking domain tests (grace window, 6th-miss decay, streak reset on return, floor guard past grace) — ranking suite 19 tests. Full npm run verify green (lint, unit, 42 e2e).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a 5-consecutive-game-day grace period to absence decay so short breaks (holiday/injury) don't cost rating. computeRatings tracks each player's consecutive-miss streak; playing resets it, the first 5 misses are free, and the existing -20/floor-1500 decay applies only from the 6th consecutive miss. Pure-domain change (packages/domain/src/ranking) — no migration; past days recompute under the new rule. ADR 0011 + tests updated; verify green.
<!-- SECTION:FINAL_SUMMARY:END -->
