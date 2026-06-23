---
id: TASK-8.1
title: a11y + empty/error states pass
status: Done
assignee: []
created_date: '2026-06-19 10:43'
updated_date: '2026-06-23 09:09'
labels:
  - 'size:M'
  - E07
dependencies: []
parent_task_id: TASK-8
ordinal: 40000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Keyboard nav + labels; every list/page has empty + error states
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Audited all routes: form inputs are label/aria-label associated, icon affordances have text, every list has an empty state, and errors surface at page/board level (DashboardPage, BoardState, PlayerProfilePage, PlayPage). Added keyboard skip-to-content links in AppShell + public Home targeting a new #main-content landmark. Full suite 56/56, lint+build clean.
<!-- SECTION:NOTES:END -->
