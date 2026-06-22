---
id: TASK-7.3
title: Fund/inventory UI (Stitch design)
status: In Progress
assignee:
  - '@ramindusn'
created_date: '2026-06-19 10:43'
updated_date: '2026-06-22 11:03'
labels:
  - 'size:L'
  - E06
dependencies:
  - TASK-1.5
parent_task_id: TASK-7
ordinal: 38000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dashboard: balances, inventory, transactions; admin add/edit; dual-render
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Data layer + live dashboard delivered (read + add). TanStack Query (ADR 0006): QueryClientProvider in main; fund/api.ts assembles FundState from admin-scoped tables (RLS) + write helpers (member/contribution/product/purchase/expense/usage); fund/useFund.ts query + mutations invalidating ['fund']. DashboardPage now computes real KPIs (remaining fund, total shuttles, products, members) via @gameon/domain and renders Inventory, Member balances, and Activity tables; QuickAdd panel (Money/Shuttles tabs) populates data and recomputes live. 28 unit + 10 e2e green. REMAINING for AC#1: edit/delete, dual-render (web/mobile), richer Stitch layout (today's usage + transaction log detail).
<!-- SECTION:NOTES:END -->
