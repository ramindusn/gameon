---
id: TASK-72
title: >-
  Admin game-day usage: match the matchmaker model, day picker, and a 'none from
  stock' marker
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-08-05 05:46'
updated_date: '2026-08-05 05:50'
labels:
  - feature
  - inventory
  - admin
  - play
dependencies: []
priority: medium
ordinal: 133000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The admin's Game-day Usage card (fund/TodayUsage.tsx) contradicts the matchmaker's flow. Both write the same usage_entries/usage_items tables, so the DATA agrees — it is the UI that does not. Admin logs usage by DATE through QuickAdd, against the legacy club-wide pool, with no game day and no holder; the matchmaker records against a game day (session_id) and deducts from a named holder's stock (fund/GameDayUsage.tsx + usageApi.ts).

Rework the admin side to the matchmaker's model:
- A dropdown to choose the game day, listing days that have no usage recorded yet, newest first, with the latest selected by default. A dropdown (not the matchmaker's chips) because there can be many game days.
- Below it, the same UI as the matchmaker: holder chips, then only that holder's brands with what they have left (barrels + loose + total) and one Used box each.
- Keep the recorded/cost history so the admin still sees spend.

Also add a 'none from stock' option to the popup (matchmaker AND admin): some game days use shuttles brought from outside the club stock, and there must be a way to say so — otherwise the day sits on the admin's missing-usage list forever. Recorded as a usage_entries row with no usage_items: the day counts as answered, nothing is deducted and no cost is added.

Blockers to solve: loadStockContext() bails when the signed-in user has no player_profiles row and only sets myHolderId for matchmakers, so the shared form renders nothing for an admin — an admin needs to see the form with no holder preselected and pick whose stock it came out of. Admin RLS already allows the writes (the *_admin policies stay per the game_day_usage migration).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admin can pick a game day from a dropdown that lists days with no usage recorded, newest first
- [x] #2 The latest such game day is selected by default
- [x] #3 Admin sees the same holder-chips + per-brand stock form the matchmaker uses, with no holder preselected
- [x] #4 Recording from the admin panel deducts from the chosen holder exactly as the matchmaker's flow does
- [x] #5 Both matchmaker and admin can mark a game day as using no club stock, and it then drops off the missing-usage list
- [x] #6 A day marked 'none' is shown as such, not as 'nothing recorded yet'
- [x] #7 The admin still sees recorded usage and its cost
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
New fund/AdminGameDayUsage.tsx on the dashboard, above the existing TodayUsage (kept, so the admin still sees recorded usage + cost). It lists casual game days with no usage entry, newest first, in a dropdown, and reuses the matchmaker's GameDayUsage form keyed on the chosen day. Selection follows the list rather than being pinned at mount, so the latest outstanding day is chosen as soon as data lands; an explicit pick wins after that. Dropdown (not chips) because there can be many game days — noted that a native select's list is OS chrome on a phone, which is fine for a desktop-first admin screen. Unblocked the admin path in usageApi.loadStockContext: it no longer bails when the user has no player_profiles row (falls back to the admins table for club_id) and reports isAdmin; GameDayUsage/-Panel now render for myHolderId OR isAdmin, so an admin gets the form with no holder preselected and must say whose barrels it was. Admin RLS already permitted the writes. 'None from stock': recordGameDayUsage takes none:true and writes the usage_entries row with no usage_items — the day counts as answered (drops off the pending list), nothing is deducted, no cost. The panel distinguishes it ('No club shuttles were used this game day') from never-asked. Tests: +5 AdminGameDayUsage (pending list/newest-first, latest default, all-done, admin form with nothing preselected, hidden for non-admins), +2 GameDayUsage (records none; a none day reads as such). Verify green: lint, typecheck, 358 unit, 40 e2e.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Admin game-day usage now follows the matchmaker's model instead of contradicting it. A new dashboard card lists game days still missing usage in a dropdown (newest first, latest selected by default) and reuses the matchmaker's form — holder chips, then that holder's brands with what is left. Admins were previously locked out of that form (loadStockContext bailed without a player_profiles row and only set myHolderId for matchmakers); they now resolve via the admins table and get the form with no holder preselected. Added a 'no club shuttles were used' answer for days played on outside shuttles: a usage entry with no items, so the day leaves the pending list without deducting stock or adding cost, and is displayed as such. The existing usage/cost history is untouched. Verified: lint, typecheck, 358 unit tests, 40 e2e.
<!-- SECTION:FINAL_SUMMARY:END -->
