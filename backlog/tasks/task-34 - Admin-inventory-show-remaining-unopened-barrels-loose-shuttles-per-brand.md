---
id: TASK-34
title: 'Admin inventory: show remaining unopened barrels + loose shuttles per brand'
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-07-09 07:06'
updated_date: '2026-07-09 11:35'
labels:
  - feature
  - inventory
  - admin
dependencies: []
priority: medium
ordinal: 88000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On the admin view, show the remaining stock broken down as full/unopened barrels PLUS loose shuttles, per shuttle brand/product — rather than only a single total shuttle count. The domain already models this: Product has barrels, shuttlesPerBarrel and looseShuttles, and calc.ts exposes productShuttleCount (barrels*perBarrel + loose) and totalShuttlesInStock (packages/domain/src/fund/calc.ts). This task surfaces the barrel vs loose split in the admin inventory UI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admin inventory shows, per product/brand, the number of full unopened barrels remaining and the loose shuttles remaining, separately
- [x] #2 A derived total shuttle count is still shown (barrels*shuttlesPerBarrel + loose)
- [x] #3 Low-stock indication continues to work off the total
- [x] #4 Empty/zero states render cleanly (0 barrels, 0 loose)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented in apps/badminton/src/fund/Inventory.tsx. The UI already showed per-batch 'barrels' (historical purchase count) + loose + total, but never surfaced product.barrels = remaining UNOPENED barrels (the live stock that recordUsage maintains). Added a 'Barrels left' column (desktop) and a 'Barrels remaining' row (mobile) rendering product.barrels on the per-product summary row, alongside loose and the derived total (productShuttleCount). Relabelled the mobile batch row 'Barrels'→'Batch barrels' to disambiguate purchased vs remaining. Low-stock unchanged (isLowStock still off the total). Added testids barrels-left-/loose-left-/total-shuttles- and a new Inventory.test.tsx (split display, zero state, low-stock-off-total). Full verify green: lint, 187 unit, 42 e2e; app build+typecheck pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Admin inventory now shows remaining unopened barrels (product.barrels) as its own field per product — 'Barrels left' column (desktop) / 'Barrels remaining' row (mobile) — next to loose shuttles and the derived total, so stock reads as barrels + loose rather than a single number. Mobile batch label disambiguated to 'Batch barrels'. Low-stock still derives from the total. Added Inventory.test.tsx (split, zero state, low-stock). Verified: lint, 187 unit tests, 42 e2e, app typecheck/build.
<!-- SECTION:FINAL_SUMMARY:END -->
