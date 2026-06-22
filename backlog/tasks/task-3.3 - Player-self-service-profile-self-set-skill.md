---
id: TASK-3.3
title: Public player profile (read-only) + history
status: Done
assignee: []
created_date: '2026-06-19 10:42'
updated_date: '2026-06-22 12:45'
labels:
  - 'size:S'
  - E02
dependencies:
  - TASK-1.5
parent_task_id: TASK-3
ordinal: 23000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Anyone can view a player's profile: performance + match history (no login)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Public PlayerProfilePage at /players/:id (no login, not gated). Shows name + skill + Matchmaker/Absent, with Performance + Match history empty states (data lands in E04/E05). getPlayer() public read; roster names link to it. e2e: profile reachable signed-out.
<!-- SECTION:NOTES:END -->
