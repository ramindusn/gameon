---
id: TASK-83
title: Remove products.barrels — the deprecated stock pool behind three bugs
status: Done
assignee:
  - '@claude'
created_date: '2026-08-07 14:23'
updated_date: '2026-08-07 14:23'
labels:
  - refactor
dependencies: []
priority: high
ordinal: 149000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
products.barrels / loose_shuttles were THE stock before barrels were handed to individual matchmakers (TASK-69). Since then stock has lived in holdings and productStock() ignored the columns whenever any holding existed, but they stayed writable and the reducers kept writing them. The matchmaker_stock migration said they would go 'in a later migration'; that never happened.

Leaving them cost three bugs, all the same shape — a write path and its undo pointing at different stores, so a change landed on a figure nobody could see while the real stock sat untouched:
  TASK-77  deleting usage credited the pool, so shuttles never came back
  TASK-81  deleting a game day left its usage behind entirely
  TASK-82  deleting a purchase debited the pool, so barrels never left

Each earlier fix redirected one path. The column was the class.

REMOVED: Product.barrels / looseShuttles; productShuttleCount(product) and isLowStock(product), which only read the pool; recordUsage(), dead since usage moved into record_game_day_usage(); productStock()'s fallback, so a product nobody holds has no stock rather than a second figure; the barrels/loose fields on the product EDIT form, since correcting a count is Adjust on the holding (TASK-82); and the DB columns.

Verified before dropping: prod's columns and holdings agreed exactly (RSL 17b+1l = 205 both ways, Victor 7b+10l = 94 both ways), so nothing was discarded that holdings did not already say.

Purchases keep their own barrels — that is how many were bought, not how many are in stock. Holdings keep theirs — that is the stock.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Product carries no stock figures, in the type or the database
- [x] #2 Stock is read from holdings with no fallback
- [x] #3 Deleting a purchase or product cannot silently change an unseen figure
- [x] #4 Correcting a count is Adjust on a holding, not a product edit
<!-- AC:END -->
