---
id: TASK-58
title: >-
  Individual leaderboard: move inactive players into a collapsible 'Inactive'
  section
status: Done
assignee: []
created_date: '2026-07-25 21:47'
updated_date: '2026-07-25 21:52'
labels:
  - feature
  - ranking
  - ui
dependencies: []
ordinal: 112000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On the Individual leaderboard board (PlayerBoardList in apps/badminton/src/ranking/Leaderboard.tsx), players flagged inactive (missed the last 5 game days, per loadInactivePlayers) currently still rank inline in the main numbered list with just a small 'inactive' tag next to their name — their decaying rating still occupies a rank position. The admin wants inactive players pulled out of the ranked list entirely and grouped in their own collapsible section below, the same treatment TASK-40 gave provisional (high-RD, 'Needs more games') entries. A player who is both inactive and provisional goes to the Inactive section (inactive is the more specific signal — their rating isn't just unsettled, it's actively decaying from absence), so provisional-but-active players still land in 'Needs more games' as today, and the two sections never double-count a player. Only the Individual board is in scope (loadInactivePlayers/the inactive concept is not wired into the Doubles/pair board today).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Inactive players (per the inactive set passed to PlayerBoardList) never appear in the main numbered ranking, regardless of their RD/established status
- [x] #2 Inactive players render in a new collapsible 'Inactive (N)' section below the main list (and below 'Needs more games' if both are present), unranked (no position number), matching the muted/unranked row style provisional entries already use
- [x] #3 A player who is both provisional and inactive appears only in the Inactive section, not also in 'Needs more games'
- [x] #4 The 'Needs more games' section's count/contents reflect only provisional players who are NOT inactive
- [x] #5 Section auto-expands when it is the only content on the board (mirrors the existing 'Needs more games' defaultOpen behavior), otherwise starts collapsed
- [x] #6 Existing per-row inactive-tag/legend copy is reconciled with the new section (no redundant inline tag once the row is already grouped under 'Inactive', unless still useful for clarity — implementer's call, but the legend must still accurately describe what 'Inactive' means)
- [x] #7 Existing tests updated for the new placement (LeaderboardPage.test.tsx's inactive-player assertions) plus new coverage for: an established+inactive player moving to the Inactive section, a provisional+inactive player appearing only there, and the section's collapse/expand + auto-open behavior
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented in apps/badminton/src/ranking/Leaderboard.tsx: PlayerBoardList now partitions players into ranked (established+provisional, excluding anyone inactive) vs a new collapsible InactiveGroup section. Precedence: inactive players never appear in the main list or 'Needs more games', regardless of RD. InactiveGroup mirrors NeedsMoreGames (unranked rows, muted style, auto-expands only when it's the sole content) but is a separate component since NeedsMoreGames is also shared by PairBoardList, which doesn't have an inactive concept. Removed the old inline per-row 'inactive' badge/tag (redundant once the row is under a section literally labelled Inactive); updated LeaderboardLegend copy accordingly. Updated LeaderboardPage.test.tsx (added a provisional+inactive fixture player to verify no double-counting) and added a new apps/badminton/src/ranking/Leaderboard.test.tsx for direct PlayerBoardList coverage of the auto-expand-when-only-content case and unranked-row rendering. Verified visually on localhost (dev DB): screenshotted the real leaderboard via a one-off Playwright script — collapsed state shows 'Inactive (2)' with no inline tags in the ranked list; expanded state shows Tharindu/Samath unranked and muted under the section, no console errors. Full suite passes except the pre-existing unrelated PlayerProfilePage timezone failure (also fails on main).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Inactive players are now pulled entirely out of the Individual leaderboard's numbered ranking into a collapsible 'Inactive (N)' section below (same treatment TASK-40 gave provisional entries), instead of ranking inline with a small tag. A player who is both provisional and inactive counts only as inactive. Verified with new/updated unit tests and a live screenshot against the dev DB.
<!-- SECTION:FINAL_SUMMARY:END -->
