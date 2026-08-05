---
id: TASK-69.4
title: >-
  Custodian inventory UI: club overview per brand, my-stock view, edit with
  logging, audit log display
status: To Do
assignee: []
created_date: '2026-08-04 06:51'
updated_date: '2026-08-04 08:43'
labels:
  - feature
  - inventory
  - admin
dependencies: []
parent_task_id: TASK-69
ordinal: 126000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the admin Inventory UI: a club overview showing per-brand total barrels + loose + total across all custodians; a per-custodian breakdown; a 'My stock' section for the signed-in admin's own holdings; controls for any admin to add/adjust a custodian's counts; and a readable audit log of recent inventory changes (who/when/what). Professional terminology ('Custodian'). Tests for overview totals, my-stock filtering, and that an edit surfaces in the log.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Club overview lists each brand with total barrels + loose + derived total across all custodians
- [ ] #2 Per-custodian breakdown shows how much each holder has per brand
- [ ] #3 Signed-in admin sees a 'My stock' view of just their own holdings
- [ ] #4 Any admin can add/adjust a custodian's counts from the UI; the change appears in the audit log with who made it
- [ ] #5 Recent inventory changes are listed (actor, time, custodian, brand, change)
- [ ] #6 UI uses 'Custodian' terminology; zero/empty states render cleanly
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SUPERSEDED (2026-08-04): the admin-custodian model was replaced by matchmaker-owned stock. Barrels are now allocated to matchmakers who keep them; assignment is mandatory; admins transfer between matchmakers; matchmaker write access is limited to their own game-day usage (follow-up task). The custodians table and 'Custodian' vocabulary are dropped. These migrations were never committed or deployed to prod, so they are squashed into a single clean migration rather than shipping create-then-drop churn.
<!-- SECTION:NOTES:END -->
