---
id: TASK-31
title: Resting players not visible on the game-day/play view (mobile + web)
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-07-09 07:06'
updated_date: '2026-07-11 16:03'
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
- [x] #1 The play/session view shows, per round, which present players are resting (not assigned to any court that round)
- [x] #2 Resting players are visible and legible on mobile viewport (Pixel 7) and desktop
- [x] #3 When no one is resting in a round, no empty 'resting' label is shown
- [x] #4 Resting list reflects live line-up edits / added or deleted matches for that round
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Derive per-round resting = session players not booked in that round's live results (restingInRound helper).
2. Render a 'Resting: …' line under each round's courts on PlayPage, matching GeneratePage's 'Sitting' style (text-xs, wraps on mobile).
3. Only show the label when someone is resting.
4. Add PlayPage tests: positive (round-2 fixture makes players rest round 1) + negative (no label when all booked).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added restingInRound() deriving resting players from live results; renders 'Resting: …' per round on PlayPage (all viewports, text-xs). Since it's derived from data.results it tracks line-up edits and added/deleted matches (AC#4). Added 2 tests; all 17 PlayPage tests + tsc pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
PlayPage now surfaces resting players per round. Added restingInRound() which computes present game-day players not assigned to any court in that round's live results, rendered as a 'Resting: …' line under each round (matching GeneratePage's 'Sitting' style; text-xs, legible/wrapping on mobile + desktop). The label is hidden when nobody rests. Because it derives from data.results, it tracks live line-up edits and added/deleted matches. Verified with 2 new PlayPage tests (positive + no-label cases); all 17 PlayPage tests and tsc pass.
<!-- SECTION:FINAL_SUMMARY:END -->
