---
id: TASK-31
title: Resting players not visible on the game-day/play view (mobile + web)
status: To Do
assignee: []
created_date: '2026-07-09 07:06'
labels:
  - bug
  - play
  - ui
dependencies: []
priority: medium
ordinal: 85000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
During a game day, the players sitting out a round (resting) are not shown on the play/session view. The user first noticed it in mobile view but believes it is missing on web too. The draw preview on the Generate page already renders a 'Sitting: …' line per round (GeneratePage.tsx ~line 340 using round.sitting), but the live PlayPage does not surface who is resting each round. Show the resting players per round so the matchmaker knows who is free to sub in or add to a custom match. Confirm whether it is truly missing on both viewports or only styled out on mobile.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The play/session view shows, per round, which present players are resting (not assigned to any court that round)
- [ ] #2 Resting players are visible and legible on mobile viewport (Pixel 7) and desktop
- [ ] #3 When no one is resting in a round, no empty 'resting' label is shown
- [ ] #4 Resting list reflects live line-up edits / added or deleted matches for that round
<!-- AC:END -->
