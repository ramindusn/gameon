---
id: TASK-67
title: >-
  Faster add-a-game: tap-to-pick players + one-tap auto-pick (replace 4
  dropdowns)
status: Done
assignee: []
created_date: '2026-07-29 14:33'
updated_date: '2026-07-29 14:33'
labels:
  - feature
  - frontend
  - play
dependencies: []
ordinal: 120000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Matchmakers complained that adding a game mid-round takes too many steps: the 'Add custom match' form needed a round dropdown plus four separate player dropdowns (a1/a2/b1/b2), repeated for every match. Replace the four dropdowns with tap-to-pick chips of the free (not-booked-this-round) players — first two tapped = Team A, next two = Team B — plus a one-tap 'Auto-pick balanced' that fills a fair foursome from the resting players using the existing draw balancer (generateRounds). Keep the round selector (defaults to the current round). Cuts a single add from ~6 steps to ~2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The add-a-game form shows free players as tappable chips (not dropdowns); tapping toggles selection and labels the two teams (A/B)
- [ ] #2 Only players not already booked in the selected round appear, still scoped to the game day's players (TASK-32 behaviour preserved)
- [ ] #3 'Auto-pick balanced' fills a balanced foursome from the free players in one tap (disabled when fewer than 4 are free)
- [ ] #4 Add match creates the match with the four picked players (first two = Team A); round + court behaviour unchanged
- [ ] #5 PlayPage tests updated for the chip flow + a new auto-pick test; typecheck, lint, and tests pass
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced the four player dropdowns in the mid-round 'Add a game' form with tap-to-pick chips (first two tapped = Team A, next two = Team B) plus a one-tap 'Auto-pick balanced' that fills a fair foursome from the resting players via the draw balancer. Cuts a single add from ~6 steps to ~2. Round scoping/exclusion preserved; covered by updated + new PlayPage tests.
<!-- SECTION:FINAL_SUMMARY:END -->
