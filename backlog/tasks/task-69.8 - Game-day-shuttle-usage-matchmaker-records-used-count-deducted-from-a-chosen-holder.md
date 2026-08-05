---
id: TASK-69.8
title: >-
  Game-day shuttle usage: matchmaker records used count, deducted from a chosen
  holder
status: In Progress
assignee:
  - '@ramindusn'
created_date: '2026-08-04 12:04'
updated_date: '2026-08-04 12:23'
labels:
  - feature
  - inventory
  - play
dependencies: []
parent_task_id: TASK-69
ordinal: 130000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Matchmakers record how many shuttles were used on a game day, per brand, and that count is deducted from a matchmaker's held stock.

Deduction rules (as specified):
- DEFAULT: deduct from the signed-in matchmaker's own barrels.
- If the signed-in matchmaker holds none of that product, ASK whose stock it should come out of — it cannot silently pick someone.
- They can ALWAYS override who it comes from, even when they do hold stock (barrels often get shared on the day).

Deduction maths mirrors the existing recordUsage reducer: total = barrels*shuttlesPerBarrel + loose; the remainder becomes floor(remaining/perBarrel) barrels + the rest loose — i.e. using 4 from a single 12-barrel leaves 0 barrels + 8 loose.

Recording is allowed BEFORE finishing the game day and ALSO afterwards, linked back to that game day. A matchmaker may edit only their own entries; admins see all usage and the per-brand expense.

Absorbs TASK-35. Needs schema work: usage_entries has no session_id and is admin-only RLS today, and matchmakers currently have no write path at all.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Usage is recorded per brand for a game day and deducts from a named holder's stock
- [x] #2 The deduct-from holder defaults to the signed-in matchmaker when they hold that product
- [x] #3 When the signed-in matchmaker holds none of it, the holder must be chosen explicitly — no silent fallback
- [x] #4 The holder can be overridden even when the signed-in matchmaker does hold stock
- [x] #5 Deduction opens barrels into loose shuttles correctly (4 from one 12-barrel leaves 0 barrels + 8 loose)
- [ ] #6 Usage can be recorded before finishing a game day and also added afterwards, linked to that game day
- [ ] #7 A matchmaker can edit only their own usage entries; admins see all usage and per-brand expense
- [x] #8 Usage cannot exceed what the chosen holder actually has
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Domain: deductUsage (loose first, then opens barrels — 4 from a 12-barrel leaves 0 barrels + 8 loose; returns null rather than clamping when the holder hasn't got that many), defaultUsageHolder (the signed-in matchmaker, but ONLY if they hold that product — otherwise undefined so the UI is forced to ask), holdersOfProduct (override candidates). 10 tests.

Migration 20260804030000_game_day_usage.sql: usage_entries.session_id + recorded_by, usage_items.holder_id, and the matchmaker write path. Matchmakers may insert usage stamped with their own auth.uid() and update/delete ONLY rows they recorded (USING confines them to their own; WITH CHECK stops reassigning on the way out). Applied to dev.

PERMISSION TRADE-OFF, deliberate: holdings_matchmaker_update is NOT limited to their own holding, because the feature explicitly allows saying the shuttles came out of another matchmaker's barrels. Mitigated by the audit log (every deduction records the actor) rather than blocked. Insert/delete on holdings stay admin-only, so a matchmaker can draw stock down but never create or remove an allocation.

Data layer (usageApi.ts): loadStockContext (matchmaker-safe read — loadFund is admin-gated), loadSessionUsage, recordGameDayUsage. All deductions are computed and validated BEFORE any write, so a line that would take someone below zero fails the whole record instead of leaving a half-applied deduction.

UI: GameDayUsage on the play page for matchmakers, live and after finishing. 9 tests covering the default, the no-silent-fallback ask, the override, candidate filtering, and the over-draw refusal. PlayPage.test mocks the card (that suite has no QueryClient).

Gates: typecheck, lint, 332/332 unit, build, 8/8 play e2e.
<!-- SECTION:NOTES:END -->
