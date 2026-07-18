---
id: TASK-54
title: 'Game-day panel polish: combined panel, blue match points, tidy metric key'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-07-18 17:10'
updated_date: '2026-07-18 17:10'
labels: []
dependencies: []
ordinal: 108000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up polish on the live game-day page after TASK-53, reviewed on localhost. Combine tabs + round pager + tab content into one panel with a sticky header. Court cards tinted as sections, Delete moved to the card header (two-step), scored courts marked with a check. Match cards show the game-day match points (score margin, blue = Points colour) instead of ranking swings; Ranking stays in Standings. Metric definitions moved to the top of the panel as a neat two-line key (no dots). Round pager dots disambiguated: colour = progress, ring = current round.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tabs, round pager and content render as one combined panel; tabs+pager stick together
- [ ] #2 Decided court cards show the signed score margin in the blue Points colour; no ranking pills on cards
- [ ] #3 Points/Ranking definitions appear once at the top of the panel on both tabs
- [ ] #4 Pager dots: green = round fully scored, ring marks the viewed round
- [ ] #5 Delete is a two-step header action on court cards; scored courts show a check
<!-- AC:END -->
