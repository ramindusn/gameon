---
id: TASK-9.4
title: Profile search
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-21 19:42'
updated_date: '2026-06-22 21:32'
labels:
  - 'size:S'
  - E08
dependencies: []
parent_task_id: TASK-9
ordinal: 49000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Search finds any player profile by name
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Public SearchBox (search/SearchBox.tsx) wired into the home top-nav: filters the public roster by nickname (case-insensitive), dropdown of matches linking to /players/:id; clears on select. Reuses the public-read useRoster (works logged-out). 3 unit tests (no dropdown until typing, finds by name, empty message). 117 unit total green.
<!-- SECTION:NOTES:END -->
