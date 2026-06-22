---
id: TASK-7.3
title: Fund/inventory UI (Stitch design)
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-19 10:43'
updated_date: '2026-06-22 11:16'
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
- [x] #1 Dashboard: balances, inventory, transactions; admin add/edit; dual-render
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Data layer + live dashboard delivered (read + add). TanStack Query (ADR 0006): QueryClientProvider in main; fund/api.ts assembles FundState from admin-scoped tables (RLS) + write helpers (member/contribution/product/purchase/expense/usage); fund/useFund.ts query + mutations invalidating ['fund']. DashboardPage now computes real KPIs (remaining fund, total shuttles, products, members) via @gameon/domain and renders Inventory, Member balances, and Activity tables; QuickAdd panel (Money/Shuttles tabs) populates data and recomputes live. 28 unit + 10 e2e green. REMAINING for AC#1: edit/delete, dual-render (web/mobile), richer Stitch layout (today's usage + transaction log detail).

Faithful port of the badminton-tracker dashboard into Emerald Pro (theme only changed). @gameon/domain gained pure reducers (addProduct/updateProduct/deleteProduct/updateBatchPrice/recordUsage/addMember/addCash/addExpense/deleteTransaction with stock+fund reversal) + usageHistory + date/format helpers, all unit-tested (5 reducer tests incl. reversal invariants). App: fund/sync.ts diff-persist to Supabase; useFund() = TanStack Query load + optimistic setQueryData + syncState (ADR 0006 preserved). Components ported 1:1: QuickAdd (transaction chooser + cash/expense/usage modals), FundSummary, TodayUsage (game-day history + delete), Inventory (batch rows, add/edit/delete product, mobile cards + desktop table), TransactionLog (badges, pagination, delete + edit batch price), MemberBalances (+add member). StatCard restyled; added fg-subtle token. Dashboard composed like prototype. 33 unit + 10 e2e green.
<!-- SECTION:NOTES:END -->
