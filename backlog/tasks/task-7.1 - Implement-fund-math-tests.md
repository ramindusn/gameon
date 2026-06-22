---
id: TASK-7.1
title: Implement fund math + tests
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-19 10:43'
updated_date: '2026-06-22 10:54'
labels:
  - 'size:M'
  - E06
dependencies: []
parent_task_id: TASK-7
ordinal: 36000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pure calc for remaining fund = contributions + usage income - purchases - expenses; unit tested
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ported fund/inventory math into @gameon/domain/fund (types.ts, calc.ts, fixtures.ts). remainingFund = contributions + usage income − purchases − expenses; plus avgBarrelPrice/costPerShuttle (weighted by batch), stock counts/low-stock, memberBalances (net split, reconciles with remainingFund), usageForDate. 16 unit tests (incl. fund-reconciliation invariant). AppState renamed FundState.
<!-- SECTION:NOTES:END -->
