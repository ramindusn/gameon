---
id: TASK-10.5
title: Finish gating + recompute & attendance for scored/partial play
status: To Do
assignee: []
created_date: '2026-06-22 20:39'
labels:
  - E09
  - 'size:M'
dependencies:
  - TASK-10.3
  - TASK-10.4
parent_task_id: TASK-10
ordinal: 58000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enforce the game-day completion rule and keep ranking correct for partial play. Finishing a game day is blocked while any match is unresolved (has no score); the UI lists the outstanding matches so the matchmaker can score or delete each one. Once every match is scored (or deleted), finishing succeeds and triggers the ranking recompute. Confirm only finished game days contribute to ranking and that deleted/unplayed matches do not count. The attendance snapshot must mark present = a player who appeared in a played (scored) match that day; everyone else is absent (absence-decay applies). Update ADR 0011 if attendance semantics change. Cover with unit tests (winner-from-score, finish gating) and an e2e flow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The matchmaker cannot finish a game day while any match is unresolved; the UI lists the outstanding matches
- [ ] #2 After every match is scored or deleted, finishing succeeds and triggers the ranking recompute
- [ ] #3 Only finished game days contribute to ranking; deleted/unplayed matches do not count
- [ ] #4 Attendance snapshot marks present = appeared in a played (scored) match that day; others absent
- [ ] #5 Unit tests (winner-from-score, finish gating) and an e2e (create game day with date/time -> edit line-up -> add custom match -> score all -> finish -> leaderboard updates) pass
<!-- AC:END -->
