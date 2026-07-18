---
id: TASK-53
title: >-
  Live game-day UX overhaul: win predictor, paged rounds, standings colours,
  toasts, share
status: Done
assignee:
  - '@claude'
created_date: '2026-07-18 16:25'
updated_date: '2026-07-18 16:32'
labels: []
dependencies: []
ordinal: 107000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Iterative polish of the live game-day page reviewed on localhost/phone. Even-match odds tied to the displayed % (rounds-to-50/50 = no favourite, equal points, never an upset). Court cards redesigned as side-by-side match cards (Team A vs Team B, centre score/inputs, winner-only green, per-team win % + predictor bar). Rounds paged with arrows + per-round progress dots, auto-opening the first unfinished round. Standings tab: ranking-gain column, blue Points vs green Ranking colour language (shared metricColors), plain-language caption; tab renamed Standings; tab bar detached from the session card. Toasts coalesce and clear the mobile tab bar. Share button on finished game days (native share sheet / wa.me).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Rounds-to-50/50 matches show Even with no favourite; equal points either way; no Upset label
- [ ] #2 Court cards render teams side by side with centre score; only the decided winner is green
- [ ] #3 Rounds are paged with arrows + progress dots; page auto-opens the first unfinished round
- [ ] #4 Standings shows Won-Lost, Points (blue) and Ranking (green) with an explanatory caption; consistent colours on the public game-day page
- [ ] #5 Identical rapid toasts coalesce; toasts clear the mobile bottom nav
- [ ] #6 Finished game days offer a Share action composing a chat-ready results summary
<!-- AC:END -->
