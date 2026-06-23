---
id: TASK-12.4
title: Isolated Fixed Pairs leaderboard UI
status: Done
assignee: []
created_date: '2026-06-23 12:37'
updated_date: '2026-06-23 12:53'
labels:
  - E11
dependencies: []
parent_task_id: TASK-12
ordinal: 66000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 LeaderboardPage shows a Fixed Pairs (Tournament) board ranked by points; public read; tournament sessions badged in play/history
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
FixedPairStandingsList (rank, pair, played, points, absence marker) in Leaderboard.tsx; LeaderboardPage shows a 'Fixed Pairs (Tournament)' card. Tournament badges on MatchmakerHome live/history rows + PlayPage header. 161 tests pass.
<!-- SECTION:NOTES:END -->
