---
id: TASK-18
title: 'Make Modal accessible (focus trap, ARIA, scroll lock)'
status: Done
assignee: []
created_date: '2026-06-27 22:33'
updated_date: '2026-06-27 22:36'
labels:
  - ui-ux
dependencies: []
priority: high
ordinal: 72000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
packages/ui Modal closes on Escape but is missing: role=dialog + aria-modal + aria-labelledby, moving focus into the dialog on open, focus trapping, restoring focus to the trigger on close, and locking body scroll while open. Audit item #4. This underpins the ConfirmDialog work (TASK-18).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Modal has role=dialog, aria-modal=true, and is labelled by its title
- [x] #2 Focus moves into the dialog on open and is restored to the previously focused element on close
- [x] #3 Focus is trapped within the dialog (Tab/Shift+Tab cycle inside)
- [x] #4 Body scroll is locked while the modal is open
- [x] #5 Escape-to-close still works and a unit test covers focus + aria behaviour
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Modal now has role=dialog/aria-modal/aria-labelledby, moves focus in on open + restores on close, traps Tab, locks body scroll, keeps Escape-to-close, and animates in (motion-safe). Added Modal.test.tsx (5 tests).
<!-- SECTION:FINAL_SUMMARY:END -->
