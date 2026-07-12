---
id: TASK-42
title: Fix leaderboard profile links + minimal/aligned mobile search
status: Done
assignee: []
created_date: '2026-07-12 16:59'
updated_date: '2026-07-12 17:00'
labels:
  - bug
  - ui
dependencies: []
ordinal: 96000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Leaderboard player names weren't clickable (couldn't open profiles). Search was desktop-only and, when added to mobile, was bulky with a misaligned dropdown. Fixes: make leaderboard names link to /players/:id with a dotted-underline tap affordance + legend hint; add a full-width mobile search row; redesign SearchBox to be minimal (magnifier icon, subtle border) with a dropdown aligned to the input.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Leaderboard names (individual + doubles) link to the player profile with a visible tap affordance
- [x] #2 Search is available on mobile and the results dropdown aligns to the input
- [x] #3 Search box is minimal (icon, subtle border) on both mobile and desktop
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Leaderboard names now link to profiles (dotted-underline affordance + legend hint). Search redesigned: full-width responsive input with a magnifier icon and subtle styling; dropdown aligned to the input; added a mobile search row. Verified on localhost against prod-cloned dev data.
<!-- SECTION:FINAL_SUMMARY:END -->
