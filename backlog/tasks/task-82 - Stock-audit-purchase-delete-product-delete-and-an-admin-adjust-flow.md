---
id: TASK-82
title: 'Stock audit: purchase-delete, product-delete, and an admin adjust flow'
status: Done
assignee:
  - '@claude'
created_date: '2026-08-07 13:11'
updated_date: '2026-08-07 13:12'
labels:
  - bug
dependencies: []
priority: high
ordinal: 148000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Thorough sweep for the same class of bug as TASK-77/81 — a write path and its undo targeting different stores. Three findings, all reachable from the dashboard.

1. DELETING A PURCHASE BATCH did not change the stock. The reducer adjusted products.barrels, the deprecated pool productStock() ignores whenever holdings exist, so the cost came off the fund and the barrels stayed on screen. The confirm dialog even promised 'This also removes those barrels from inventory'. A purchase names no holder, so there is no way to know whose stock to reduce — it now leaves stock alone and says so, pointing at Adjust.

2. DELETING A PRODUCT destroyed stock unaudited. holdings.product_id is ON DELETE CASCADE, so a matchmaker's barrels vanished with zero inventory_log rows — verified on dev before the fix (holdings 1->0, logs +0). Deleting the last purchase batch of a product does the same, because that path deletes the product too. Fixed with a BEFORE DELETE trigger on holdings rather than logging at each call site, so cascades and any future path are covered; delete_holding() stops writing its own row to avoid double-logging.

3. NO WAY TO CORRECT A COUNT. changeStock() was wired to the audited change_stock() function but nothing in the UI called it. Added an Adjust action per holding: absolute counts (an admin is looking at what is physically there), a mandatory reason, and a preview of the delta. This is what makes TASK-81 safe — deletion can mean 'undo' because a genuine consumption outside a game day now has its own home.

VERIFIED CLEAN in the same sweep: player deletion is blocked while they hold stock or are in a pair (RESTRICT on holdings.holder_id and both tournament_teams columns); match history survives player/team deletion (SET NULL); ratings and attendance cascade correctly as derived data; inventory_log rows survive product and player deletion via SET NULL plus denormalised labels.

GOTCHA: the first version of the trigger referenced old.product_id, which violates inventory_log's FK when it fires as part of the product's own cascade — the product is already gone. Caught by probing dev, not by review. It nulls the reference and leans on the denormalised label.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Deleting a purchase no longer claims to change stock it does not change
- [x] #2 No holding can be deleted without an inventory_log entry, including via cascade
- [x] #3 An admin can correct a matchmaker's count with a reason, outside any game day
- [x] #4 Deleting a stock record still logs exactly once, not twice
<!-- AC:END -->
