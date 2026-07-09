---
id: TASK-32
title: 'Add-match should list only the game day''s players, not the whole roster'
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-07-09 07:06'
updated_date: '2026-07-09 07:26'
labels:
  - bug
  - play
dependencies: []
priority: medium
ordinal: 86000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When adding a new (custom) match to an already-existing game day, the player dropdowns load ALL non-absent roster players instead of the players who are actually in that game day. This mirrors the already-fixed TASK-24 (line-up editing scoped to the game day's players) but for the add-custom-match flow. In PlayPage.tsx the line-up editor is passed present={sessionPlayers} (the distinct players across the day's matches), but the add-custom-match form is passed present={present} (the whole present roster). Scope the add-match selectors to the game day's players so custom matches stay within the people at the venue.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The add-custom-match player selectors list only the players already part of that game day (sessionPlayers), matching the line-up editor
- [x] #2 Behaviour is consistent with TASK-24's line-up editing scope
- [x] #3 Edge case: a game day whose matches were all edited still derives its player set correctly
- [x] #4 An e2e or unit assertion covers the scoped option list for add-match
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fix: PlayPage.tsx passed present={present} (whole non-absent roster) to <AddCustomMatch>; changed to present={sessionPlayers} so the add-match selectors match the line-up editor's scope (TASK-24). Removed the now-unused 'present' roster memo and updated the AddCustomMatch comment. Behaviour note: because the picker is now scoped to the venue, a full round offers no players until a new round is chosen (previously it wrongly offered roster members not at the venue). Tests: rewrote the PlayPage add-match unit tests that had encoded the old behaviour (selecting p9–p12 who aren't in the game day) into a scope assertion + an AC#3 test proving the set follows edited line-ups; 15 PlayPage tests pass. Updated the play e2e 'edits a line-up, adds a custom match' spec to target a new round (round 1 is full). Full verify green: lint, 182 unit, 42 e2e.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Scoped the add-custom-match player selectors to the game day's players (sessionPlayers) instead of the whole roster, in apps/badminton/src/routes/PlayPage.tsx — one prop swap plus removal of the dead roster memo, mirroring TASK-24's line-up scope. Reconciled the PlayPage unit tests (which had baked in the old whole-roster behaviour) and the play e2e spec (custom match now targets a new round, since a full round correctly offers nobody). Verified via lint + 182 unit tests + 42 e2e (incl. the real-browser add-match flow).
<!-- SECTION:FINAL_SUMMARY:END -->
