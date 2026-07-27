---
id: TASK-63
title: >-
  Fix stale leaderboard e2e: inactive players now in a collapsible section
  (TASK-58 follow-up)
status: Done
assignee: []
created_date: '2026-07-27 21:02'
updated_date: '2026-07-27 21:04'
labels:
  - bug
  - test
dependencies: []
ordinal: 116000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-58 moved inactive players out of the ranked leaderboard list into a collapsible 'Inactive (N)' section and removed the inline inactive-tag. e2e/leaderboard.spec.ts still asserts getByTestId('player-row-e2e-8').getByTestId('inactive-tag') is visible, so the E2E (Playwright) CI job has been failing on main since TASK-58 merged (unit tests were updated then, this e2e spec was missed). Update the spec to the new behaviour: seeded absentees e2e-7/e2e-8 are not in the ranked player-board; a 'player-board-inactive-toggle' reads 'Inactive (2)'; the rows appear only after expanding it; an active player (e2e-1) ranks in the main board.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 e2e/leaderboard.spec.ts no longer references the removed inactive-tag testid
- [x] #2 Test asserts e2e-1 is visible in the ranked player-board and the Inactive toggle shows 'Inactive (2)'
- [x] #3 Test asserts inactive rows (e2e-8) are hidden until the toggle is expanded, then visible
- [x] #4 E2E (Playwright) CI job passes on main
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Updated e2e/leaderboard.spec.ts for TASK-58: replaced the removed inline inactive-tag assertions with the collapsible section flow — e2e-1 visible in the ranked player-board, player-board-inactive-toggle reads 'Inactive (2)', inactive rows hidden until expanded then visible. Verified locally: full Playwright suite 40/40 pass (ran with CI=1 so Playwright starts its own VITE_E2E server rather than reusing a plain dev server).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the stale leaderboard e2e spec that still expected the pre-TASK-58 inline inactive-tag; it now exercises the collapsible 'Inactive' section. Full e2e suite passes (40/40). Unblocks the CI E2E job on main.
<!-- SECTION:FINAL_SUMMARY:END -->
