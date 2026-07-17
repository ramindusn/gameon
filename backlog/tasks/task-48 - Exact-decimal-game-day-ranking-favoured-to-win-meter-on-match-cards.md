---
id: TASK-48
title: Exact-decimal game-day ranking + favoured-to-win meter on match cards
status: To Do
assignee: []
created_date: '2026-07-17 09:40'
labels: []
dependencies: []
ordinal: 102000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Two rating-visibility improvements. On the Game Day page, the Ranking column rounds the per-day rating change, so subtracting the two displayed whole-number ratings disagrees with it (e.g. +9 shown but endpoints look like 8). Show the change to one decimal so it's exact. On the live Play match cards, add a themed 'favoured to win' indicator: a win-probability bar that fills from the favourite's side with each team's win %, and a small accent 'Favoured' tag on the stronger team's row, computed from each team's effective skill (results-aware rating blended with manual seed).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Game Day page Ranking column shows the rating change to one decimal place (e.g. +8.6, -13.6), keeping green/red/muted colour
- [ ] #2 Live Play match cards show a win-probability bar filling from the favourite's side, labelled with each team's win %, derived from team effective-skill difference
- [ ] #3 The favourite team's row carries a clear 'Favoured' marker so which side is favoured is unambiguous
- [ ] #4 Favoured indicator only appears on undecided (unscored) live matches; even/tied strengths render as a neutral 50-50 with no favourite
- [ ] #5 Existing GameDayPage/PlayPage tests still pass; new logic (win-probability from skill diff) is unit-tested
<!-- AC:END -->
