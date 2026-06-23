---
id: TASK-12.2
title: Fixed-pair standings math (domain) + tests
status: Done
assignee: []
created_date: '2026-06-23 12:37'
updated_date: '2026-06-23 12:41'
labels:
  - E11
dependencies: []
parent_task_id: TASK-12
ordinal: 64000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pure computeFixedPairStandings ranks pairs by total points scored, applies the per-missed-day absence penalty floored at 0; unit-tested
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added packages/domain/src/ranking/standings.ts: pure computeFixedPairStandings(sessions, results, opts) ranking pairs by total points scored, with FIXED_PAIR_ABSENCE_PENALTY (default 5) deducted per tournament day missed after first appearance, floored at 0; canonical pair key. Exported from domain index. 5 unit tests green.
<!-- SECTION:NOTES:END -->
