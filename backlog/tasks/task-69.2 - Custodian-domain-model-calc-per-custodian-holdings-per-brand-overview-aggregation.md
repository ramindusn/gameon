---
id: TASK-69.2
title: >-
  Custodian domain model + calc: per-custodian holdings, per-brand overview
  aggregation
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-08-04 06:51'
updated_date: '2026-08-04 08:43'
labels:
  - feature
  - inventory
  - domain
dependencies: []
parent_task_id: TASK-69
ordinal: 124000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend @gameon/domain/fund to model Custodian and Holding, and add pure calc helpers: overview totals per product/brand summed across custodians (barrels, loose, derived total), and a single custodian's holdings view. Keep productShuttleCount/totalShuttlesInStock working off the aggregated holdings. Add fixtures + tests.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Custodian + Holding types added; FundState carries custodians + holdings
- [x] #2 Pure helper returns per-brand overview: total barrels, total loose, derived total across all custodians
- [x] #3 Pure helper returns one custodian's per-brand holdings
- [x] #4 totalShuttlesInStock / per-brand totals derive from holdings and match previous single-pool results in the migrated fixture
- [x] #5 Unit tests cover aggregation, single-custodian view, and zero/empty states
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added Custodian + Holding types and StockLevel/ProductStock/CustodianStock result shapes; FundState now carries custodians + holdings (required fields, so every construction site had to acknowledge them — caught 3: api.ts, Inventory.test.tsx, reducers.test.ts).

New pure helpers in calc.ts: productStock (one product summed across custodians), stockOverview (club-wide per-brand overview), custodianStock (one holder's stock, zero rows omitted), stockByCustodian (per-holder breakdown), custodianForUser (links a signed-in admin to their custodian), and isProductLowStock (low stock judged club-wide, not per holder — 1+1 barrels across two holders is 24 shuttles, not 'low'). totalShuttlesInStock now derives from holdings.

Compatibility bridge: when a state carries no holdings at all (exactly a pre-custodian state), the helpers fall back to the legacy Product.barrels/looseShuttles pool. Product.barrels/looseShuttles marked @deprecated. This keeps existing callers/fixtures correct until read paths move over in 69.3/69.4. Verified by a test asserting migrated holdings give an identical total to the legacy single pool.

Added makeCustodian/makeHolding fixtures + custodians.test.ts (14 tests: aggregation, per-custodian view, multi-brand holder, omitted zero rows, unknown custodian, user linking, legacy parity, club-wide low stock). Gates: typecheck, lint, 278/278 unit all green.

SUPERSEDED (2026-08-04): the admin-custodian model was replaced by matchmaker-owned stock. Barrels are now allocated to matchmakers who keep them; assignment is mandatory; admins transfer between matchmakers; matchmaker write access is limited to their own game-day usage (follow-up task). The custodians table and 'Custodian' vocabulary are dropped. These migrations were never committed or deployed to prod, so they are squashed into a single clean migration rather than shipping create-then-drop churn.
<!-- SECTION:NOTES:END -->
