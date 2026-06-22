---
id: TASK-7.2
title: Fund/inventory schema (fresh) + RLS
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-19 10:43'
updated_date: '2026-06-22 10:58'
labels:
  - 'size:M'
  - E06
dependencies:
  - TASK-1.4
parent_task_id: TASK-7
ordinal: 37000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tables for members/contributions/products/purchases/usage/expenses, club-scoped, RLS
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
fund_inventory migration applied to live DB + validated locally: members, contributions, products, purchases, usage_entries, usage_items, expenses. club_id denormalised on every table; numeric(10,2) money with check constraints; FK indexes. RLS: club-ops Admin-only — for-all policies via is_admin(club_id), DML granted to authenticated, no anon access. Validated locally: admin full CRUD, anon blocked (no grant), non-admin sees 0 rows. Advisors clean of fund-table findings. Regenerated database.types.ts.
<!-- SECTION:NOTES:END -->
