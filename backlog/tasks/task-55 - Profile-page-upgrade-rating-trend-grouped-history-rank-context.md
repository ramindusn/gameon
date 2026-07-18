---
id: TASK-55
title: 'Profile page upgrade: rating trend, grouped history, rank context'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-07-18 17:51'
updated_date: '2026-07-18 17:51'
labels: []
dependencies: []
ordinal: 109000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Upgrade the public player profile. (1) Rating trend: plot the player's leaderboard rating per game day (replaying rating periods, same engine as the leaderboard) with a Points/Rating toggle on the performance chart, coloured per the metric language. (2) Match history grouped by game day with a day header (day W-L + points) linking to /game-days/:id. (3) Leaderboard context in the header: current rank with movement vs the previous game day, or a provisional note when unranked.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Profile shows a rating-over-game-days trend using the same rating engine as the leaderboard
- [ ] #2 Chart toggles between game-day Points (blue) and Rating (green)
- [ ] #3 Match history is grouped by game day with day summary headers linking to the game-day page
- [ ] #4 Header shows leaderboard rank + movement since the previous game day (or a provisional note)
- [ ] #5 Existing profile tests pass; new logic covered
<!-- AC:END -->
