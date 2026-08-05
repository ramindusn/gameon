---
id: TASK-73
title: >-
  Admin dashboard: group the panels behind tabs, keep the KPIs static; retire
  the old date-based usage entry
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-08-05 11:15'
updated_date: '2026-08-05 11:17'
labels:
  - ui
  - admin
  - refactor
dependencies: []
priority: medium
ordinal: 134000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The admin dashboard shows seven panels at once (game-day usage, recent usage/cost, fund summary, stock, inventory, transaction log, member balances) plus four KPI cards, which reads as scattered. Keep the KPI row and QuickAdd on screen at all times — those are the at-a-glance numbers — and group the panels behind tabs so only one job is on screen: Game days (record usage + recent days/cost), Stock (allocation/transfer + inventory), Money (fund summary + transaction log + member balances). Default to Game days, the recurring job.

Also retire the legacy date-based usage entry: '+ Add transaction -> Game-day usage' wrote a date-keyed entry against the deprecated club-wide pool with no game day and no holder, which is what contradicted the matchmaker's flow in the first place (TASK-72). Usage is now recorded against a game day and a holder, so that path should go.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The KPI cards stay visible on every tab
- [x] #2 Panels are grouped into Game days / Stock / Money tabs, one group on screen at a time
- [x] #3 The dashboard opens on Game days
- [x] #4 '+ Add transaction' no longer offers Game-day usage, and the legacy recordUsage action is gone from the fund hook
- [x] #5 Copy pointing at the old path is updated to the new one
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
DashboardPage keeps the four KPI cards + QuickAdd above a tab bar (Game days / Stock / Money), rendering one group at a time: Game days = AdminGameDayUsage + TodayUsage, Stock = StockPanel + Inventory, Money = FundSummary + TransactionLog + MemberBalances. Opens on Game days since recording the day's shuttles is the recurring job and the KPI row already answers the money question at a glance. Tab bar mirrors the game-day page's pattern (role=tablist/tab, aria-selected), scrollable on narrow screens. Retired the legacy path: dropped the 'Game-day usage' choice and its UsageModal from QuickAdd, removed recordUsage from useFund, and repointed the copy in QuickAdd's picker and TodayUsage's empty state at the new Game-day usage card. The pure domain reducer recordUsage is left in @gameon/domain with its tests — deleteTransaction still models the inverse — but nothing in the app calls it now. New DashboardPage.test.tsx: KPIs persist across tabs, opens on Game days, and each tab shows only its own panels. Verify green: lint, typecheck, 362 unit, 40 e2e.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Grouped the admin dashboard's seven panels behind Game days / Stock / Money tabs with the KPI cards and QuickAdd staying put, so only one job is on screen at a time; it opens on Game days. Retired the legacy date-based usage entry ('+ Add transaction -> Game-day usage' and useFund.recordUsage) that wrote against the deprecated club-wide pool with no game day or holder — the contradiction TASK-72 set out to remove — and repointed the copy at the new card. Verified: lint, typecheck, 362 unit tests, 40 e2e.
<!-- SECTION:FINAL_SUMMARY:END -->
