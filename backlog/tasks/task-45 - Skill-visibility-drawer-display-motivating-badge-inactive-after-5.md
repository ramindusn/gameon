---
id: TASK-45
title: Skill visibility + drawer display + motivating badge + inactive-after-5
status: Done
assignee: []
created_date: '2026-07-16 21:48'
updated_date: '2026-07-16 21:48'
labels:
  - feature
  - ranking
  - ui
dependencies: []
ordinal: 99000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Public profiles hide the manual (base) skill — staff-only; everyone sees the live results-aware skill. Matchmaker draw picker shows each player's effective (rating-aware) skill. An 'Improving' badge appears when a player is winning more than losing lately. The 'inactive' leaderboard tag now requires missing the last 5 game days (grace period), not just one.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Base skill hidden on public profile; matchmaker/admin see base -> now
- [x] #2 Generate picker shows the effective (rating-aware) skill
- [x] #3 Improving badge on the profile when recently winning more than losing
- [x] #4 Inactive tag only for players who missed the last 5 game days
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Public profile hides base skill (staff-only base->now), shows live skill; generate picker shows effective skill; 'Improving' badge when recently winning; inactive tag now requires missing the last 5 game days (ABSENCE_GRACE_PERIOD). Verified in dev.
<!-- SECTION:FINAL_SUMMARY:END -->
