---
id: TASK-76.2
title: Phase 1 — stop the dashboard saying untrue things
status: To Do
assignee: []
created_date: '2026-08-05 17:58'
labels:
  - ui
dependencies: []
parent_task_id: TASK-76
ordinal: 139000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Three pieces of actively misleading UI. (1) DashboardPage.tsx renders label 'Admins' from state.members.length, which counts funding members. (2) FundSummary.tsx's footer points at '+ Add transaction' for game-day usage, which TASK-73 removed. (3) MyStock.tsx returns null when the matchmaker holds nothing, so the card silently vanishes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The people KPI names what it actually counts
- [ ] #2 No helper text refers to a flow that no longer exists
- [ ] #3 A matchmaker holding no stock sees an explanation, not an absent card
<!-- AC:END -->
