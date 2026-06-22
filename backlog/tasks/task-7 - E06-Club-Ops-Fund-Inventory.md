---
id: TASK-7
title: 'E06 - Club Ops: Fund & Inventory'
status: Done
assignee: []
created_date: '2026-06-19 09:13'
updated_date: '2026-06-22 21:55'
labels:
  - epic
dependencies: []
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rebuild fund math + inventory/transactions from scratch with a fresh design.
<!-- SECTION:DESCRIPTION:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
E06 Club Ops (Fund & Inventory) complete. Fresh fund math + inventory/transactions rebuilt: pure domain logic (calc/reducers/types/format) in packages/domain/src/fund, Stitch-design dashboard UI in apps/badminton/src/fund + /dashboard route, Supabase schema (members/contributions/products/purchases/usage/expenses) with admin-only RLS, admin app shell with live auth wiring, and full unit coverage of fund math + transaction flows. All 5 subtasks Done.
<!-- SECTION:FINAL_SUMMARY:END -->
