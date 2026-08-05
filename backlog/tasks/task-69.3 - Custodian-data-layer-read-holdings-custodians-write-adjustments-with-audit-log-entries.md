---
id: TASK-69.3
title: >-
  Custodian data layer: read holdings + custodians, write adjustments with
  audit-log entries
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-08-04 06:51'
updated_date: '2026-08-04 08:43'
labels:
  - feature
  - inventory
dependencies: []
parent_task_id: TASK-69
ordinal: 125000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend apps/badminton fund api/sync to load custodians + holdings, and to write stock adds/adjustments that also append an inventory_log row (actor = current admin). Surface the current admin's own custodian (by user_id) for the 'my stock' view.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Data layer loads custodians + holdings into fund state
- [x] #2 Add/adjust stock mutations write the holding change and an inventory_log entry in one operation (actor from session)
- [x] #3 Current admin's own custodian is resolvable for the self view
- [x] #4 Tests cover the mutation-writes-log mapping
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
loadFund now reads custodians + holdings into FundState and returns the session userId. Custodians sorted default-first then alphabetically for a stable breakdown order.

Stock writes deliberately bypass the sync.ts whole-state diff: a state diff sees only before/after counts, not WHO changed them, so it cannot produce the audit entry. Added saveStockChange (upsert holding, then insert inventory_log) with buildStockChange extracted as a pure mapping so deltas + denormalised names are unit-testable without Supabase. Also createCustodian and loadInventoryLog (newest-first) for the 69.4 UI.

useFund exposes myCustodian (custodianForUser against the session user) for the self view, plus changeStock and addCustodian, both invalidating the fund query.

api.test.ts: 9 tests over the mapping — absolute counts on the holding, positive/negative/zero deltas, actor stamped, null actor without a session, denormalised custodian_name/product_label, action + optional note.

Gates: typecheck, lint, 287/287 unit, build all green.

SUPERSEDED (2026-08-04): the admin-custodian model was replaced by matchmaker-owned stock. Barrels are now allocated to matchmakers who keep them; assignment is mandatory; admins transfer between matchmakers; matchmaker write access is limited to their own game-day usage (follow-up task). The custodians table and 'Custodian' vocabulary are dropped. These migrations were never committed or deployed to prod, so they are squashed into a single clean migration rather than shipping create-then-drop churn.
<!-- SECTION:NOTES:END -->
