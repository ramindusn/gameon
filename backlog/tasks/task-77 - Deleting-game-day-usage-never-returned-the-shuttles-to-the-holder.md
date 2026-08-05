---
id: TASK-77
title: Deleting game-day usage never returned the shuttles to the holder
status: Done
assignee:
  - '@claude'
created_date: '2026-08-05 19:52'
updated_date: '2026-08-05 19:52'
labels:
  - bug
dependencies: []
priority: high
ordinal: 143000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Recording usage deducts from holdings (usageApi.recordGameDayUsage) and logs it. Deleting credited products.barrels / loose_shuttles instead — the deprecated club-wide pool that productStock() ignores whenever holdings exist — so the shuttles landed somewhere no total reads, the holder stayed short, and inventory_log still showed the deduction standing.

REPRODUCED IN DEV: 5 Victor recorded against Sahan (7 loose -> 2), then deleted. Holdings totalled 89, the pool 99, correct was 94 — drifted 10 apart because recording only touched holdings and deleting only touched the pool.

FIX: restoreUsageHoldings() in usageApi.ts credits the holder named on usage_items.holder_id and writes an 'adjust' reversal to inventory_log, mirroring where the deduction is written. useFund.deleteTransaction calls it BEFORE removing the entry, so a failed credit leaves the entry in place rather than losing stock. The reducer now credits the pool only when state.holdings is empty — the same fallback productStock() reads by — so the legacy no-holdings path stays symmetric with recordUsage.

usage_items.holder_id is null on entries predating per-holder stock (all 11 in prod). Those never came out of a holding, so there is correctly nothing to restore.

Dev data repaired: Sahan back to 7 loose Victor, pool realigned to 94, correction logged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Deleting usage returns the shuttles to the matchmaker they were deducted from
- [x] #2 The reversal appears in the inventory log
- [x] #3 A failed credit leaves the usage entry in place
- [x] #4 Entries with no holder (pre-holdings) delete cleanly without crediting anyone
<!-- AC:END -->
