---
id: TASK-69.6
title: >-
  Matchmaker stock: domain + data layer revamp (holders, transfer, mandatory
  assignment)
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-08-04 08:43'
updated_date: '2026-08-04 11:18'
labels:
  - feature
  - inventory
dependencies: []
parent_task_id: TASK-69
ordinal: 128000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rework the fund domain and data layer from Custodian to matchmaker StockHolder: holders loaded from matchmaker player_profiles, per-brand club summary, one holder's stock, transfer between holders (two holding writes + audit entries), and purchases requiring a holder.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Domain models holders + holdings; club summary and single-holder views derive from holdings
- [x] #2 Transfer moves counts between two holders and audits both sides
- [x] #3 Adding stock requires a holder; the data layer rejects an unassigned add
- [x] #4 Unit tests cover summary, holder view, transfer, and the audit mapping
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Domain: Custodian→StockHolder (a matchmaker; id = player_profiles row, userId drives 'my stock'). FundState.custodians→holders. calc: holderStock/stockByHolder/holderForUser replace the custodian equivalents; stockOverview + isProductLowStock unchanged in behaviour (low stock stays a club-level judgement). holders.test.ts 14 tests.

Data layer: holders load from player_profiles where is_matchmaker; holdings key on holder_id. transferStock() writes the move as TWO audited stock changes (giver down, receiver up) so both sides appear in the log. loadMyStock() is a separate narrow read for matchmakers because loadFund() starts from the admins table and returns null for them; it is backed by the new matchmaker SELECT policies.

Note: a slice-based edit briefly removed Purchase/UsageEntry/Expense from types.ts — caught by typecheck and restored.
<!-- SECTION:NOTES:END -->
