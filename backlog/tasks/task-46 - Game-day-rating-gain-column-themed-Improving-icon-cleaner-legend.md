---
id: TASK-46
title: 'Game-day rating gain column, themed Improving icon, cleaner legend'
status: Done
assignee: []
created_date: '2026-07-17 07:44'
updated_date: '2026-07-17 07:44'
labels:
  - feature
  - ranking
  - ui
dependencies: []
ordinal: 100000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a 'Ranking' column to the game-day standings showing the Glicko rating points each player gained/lost that day (replay before/after the period). Replace the Improving badge emoji with a theme-matched green SVG. Rewrite the leaderboard legend's inactive/Needs-more-games/names text to be concise and professional.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Game-day detail table shows ranking points gained/lost per player
- [x] #2 Improving badge uses a themed SVG icon, not an emoji
- [x] #3 Leaderboard legend wording is professional/concise
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Game-day standings gained a 'Ranking' column (per-day Glicko rating delta via before/after replay); Improving badge now uses a themed green trending-up SVG; leaderboard legend rewritten as a concise definition list. Verified in dev.
<!-- SECTION:FINAL_SUMMARY:END -->
