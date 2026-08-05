---
id: TASK-76.4
title: Phase 3 — make the fund summary answer a question
status: Done
assignee: []
created_date: '2026-08-05 17:58'
updated_date: '2026-08-05 18:25'
labels:
  - ui
dependencies: []
parent_task_id: TASK-76
ordinal: 141000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
FundSummary repeats 'Remaining fund', which is already the first KPI card directly above it, and leads with a 'Budget utilized' bar computed as spent/moneyIn — a ratio nobody acts on. Replace with the actionable read: burn rate per game day and shuttles per euro. Also retire the all-time 'Shuttles Used' KPI, which only ever grows, in favour of the last game day or a per-day average.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The fund summary does not simply restate a KPI card above it
- [ ] #2 Cost per game day is visible without arithmetic
<!-- AC:END -->
