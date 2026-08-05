---
id: TASK-76.3
title: Phase 2 — one home for each stock number
status: To Do
assignee: []
created_date: '2026-08-05 17:58'
labels:
  - ui
dependencies: []
parent_task_id: TASK-76
ordinal: 140000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
StockPanel ('Shuttle stock': club total, per brand, held by) and Inventory ('Inventory Left': barrels remaining, loose per product) sit on the same tab and both render per-product barrels + loose from productStock(). Split by question: StockPanel owns how much we have and who holds it; Inventory becomes product management (add/edit, batch, price) and drops its remaining-stock columns.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Per-product remaining stock appears in exactly one panel
- [ ] #2 Inventory still supports adding and editing products, batches and prices
<!-- AC:END -->
