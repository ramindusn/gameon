---
id: TASK-19
title: Replace native confirm()/alert() with themed Modal confirmations
status: To Do
assignee: []
created_date: '2026-06-27 22:34'
labels:
  - ui-ux
dependencies:
  - TASK-18
priority: high
ordinal: 73000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Six destructive actions use browser-native confirm()/alert(): PlayersPage.tsx (remove player x2), Inventory.tsx (delete product x2), TodayUsage.tsx, TransactionLog.tsx. These can't be themed, look jarring, and are inconsistent with the inline 'Confirm delete' pattern already used in PlayPage and the existing Modal component. Replace all native dialogs with a consistent themed confirmation (Modal-based ConfirmDialog). Audit item #2. Depends on the accessible Modal (TASK-18).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A reusable confirm dialog (ConfirmDialog built on Modal) exists with title, message, confirm/cancel, and a danger variant
- [ ] #2 All 6 native confirm()/alert() calls are replaced with the themed confirmation
- [ ] #3 Destructive confirms use danger styling and clearly name the item being deleted
- [ ] #4 Existing PlayersPage tests still pass
<!-- AC:END -->
