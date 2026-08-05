---
id: TASK-69.7
title: >-
  Matchmaker stock UI: admin allocation + transfer, club summary, matchmaker 'my
  stock'
status: Done
assignee: []
created_date: '2026-08-04 08:43'
updated_date: '2026-08-04 11:18'
labels:
  - feature
  - inventory
  - admin
dependencies: []
parent_task_id: TASK-69
ordinal: 129000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Admin dashboard: club summary per brand, who holds what, allocate stock to a matchmaker (mandatory), transfer between matchmakers, and the audit log. Matchmaker home: a read-only view of the stock in their own hands.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admin sees club summary per brand and the per-matchmaker breakdown
- [x] #2 Admin can allocate stock to a matchmaker; the matchmaker field is required
- [x] #3 Admin can transfer barrels/loose between two matchmakers
- [x] #4 Matchmaker sees only their own stock, with no editing controls
- [x] #5 Audit log shows who changed what, when
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
StockPanel (admin dashboard): club total per brand, 'Held by' breakdown per matchmaker with a You badge, Allocate and Transfer actions, and the audit log rendered in words ('Ramindu added 5 barrels and removed 2 loose shuttles').

Allocation REQUIRES a matchmaker — submitting without one blocks with 'Choose the matchmaker who will keep this stock.' and never calls the mutation (test-covered). Allocation adds to what the holder already keeps rather than overwriting. Transfer refuses to move more than the giver holds.

MyStock (matchmaker home): read-only view of their own barrels; renders nothing at all when they hold none so it never adds an empty card. No controls by design — allocation/transfer are admin-only.

Inventory panel switched to holdings-derived figures so it cannot contradict StockPanel. MatchmakerHome.test mocks MyStock (that suite renders without a QueryClient); MyStock has its own 4 tests.

StockPanel.test 10 tests, MyStock.test 4. Gates: typecheck, lint, 301/301 unit, build green.
<!-- SECTION:NOTES:END -->
