---
id: TASK-9.2
title: 'Empty state: leaderboard-only when no draws'
status: Done
assignee: []
created_date: '2026-06-21 19:42'
updated_date: '2026-06-22 21:40'
labels:
  - 'size:S'
  - E08
dependencies: []
parent_task_id: TASK-9
ordinal: 47000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 If no draws exist, show only the leaderboard (doubles + individual)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Home game-day sections are now driven by useSessions(). When no draws exist (empty session list) the GameDays block renders nothing, so the public home shows only the leaderboard (doubles + individual previews). Once draws exist it shows 'Game Days in Progress' (live sessions) and 'Recent Game Days' (finished, capped at 6) as public read-only summary cards (date, mode, rounds, Live/Final badge). Removed the static placeholder EmptyState/MutedLink sections. 2 unit tests in Home.test.tsx cover both states.
<!-- SECTION:NOTES:END -->
