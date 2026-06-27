---
id: TASK-24
title: Edit line-up should only list that game day's players
status: Done
assignee: []
created_date: '2026-06-27 23:13'
updated_date: '2026-06-27 23:14'
labels:
  - ui-ux
dependencies: []
priority: medium
ordinal: 78000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On the Play page, the Edit line-up dropdowns list the entire active roster (PlayPage 'present' = all non-absent roster players). It should instead offer only the players who are part of this game day (the distinct players in the session's matches), so a matchmaker swaps among the people actually at the venue rather than the whole club.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Edit line-up dropdowns list only the distinct players in the current session's matches
- [x] #2 Players sitting a given round are still selectable (set spans all rounds)
- [x] #3 Score saving, line-up validation, and existing PlayPage tests are unaffected
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
PlayPage now derives sessionPlayers (distinct players across all of the session's matches) and feeds that to the Edit line-up dropdowns instead of the full roster; spans all rounds so sitting players stay selectable. Added a PlayPage test asserting roster-only players are excluded. Add-custom-match still offers the full roster intentionally.
<!-- SECTION:FINAL_SUMMARY:END -->
