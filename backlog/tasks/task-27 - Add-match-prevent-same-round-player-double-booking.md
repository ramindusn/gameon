---
id: TASK-27
title: 'Add-match: prevent same-round player double-booking'
status: Done
assignee: []
created_date: '2026-06-28 07:00'
updated_date: '2026-06-28 07:04'
labels:
  - ui-ux
dependencies: []
priority: medium
ordinal: 81000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From TASK-26: the live Play page 'Add custom match' flow only validates that the four chosen players are distinct within the match (validateLineup). A player already playing another court in the SAME round can be added again, putting one person on two courts at once. Exclude players already booked in the target round from the add-match dropdowns, and validate it on save (defence-in-depth). Keep the full active roster otherwise (late arrivals are allowed; see TASK-26 recommendation).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add-match player dropdowns exclude players already assigned to a match in the target round
- [x] #2 Saving a custom match that double-books a player in the round is rejected with a clear error (not just the within-match duplicate check)
- [x] #3 Late arrivals (active roster players not yet in the game day) remain selectable
- [x] #4 Unit test covers the double-booking rejection + that an unbooked player is allowed
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Add-match now excludes players already booked in the target round: PlayPage computes bookedInNextRound and AddCustomMatch filters the dropdowns to the active roster minus those players (late arrivals still selectable), plus a save-time guard. Two PlayPage tests cover dropdown exclusion + adding from unbooked players. lint + 180 tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
