---
id: TASK-34
title: 'Admin inventory: show remaining unopened barrels + loose shuttles per brand'
status: To Do
assignee: []
created_date: '2026-07-09 07:06'
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
- [ ] #1 Admin inventory shows, per product/brand, the number of full unopened barrels remaining and the loose shuttles remaining, separately
- [ ] #2 A derived total shuttle count is still shown (barrels*shuttlesPerBarrel + loose)
- [ ] #3 Low-stock indication continues to work off the total
- [ ] #4 Empty/zero states render cleanly (0 barrels, 0 loose)
<!-- AC:END -->
