---
id: TASK-3.4
title: Roster tests
status: Done
assignee: []
created_date: '2026-06-19 10:42'
updated_date: '2026-06-22 12:43'
labels:
  - 'size:S'
  - E02
dependencies: []
parent_task_id: TASK-3
ordinal: 24000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Unit/e2e cover roster CRUD + permissions
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Unit: roster/api.test (mapRow), PlayersPage.test (list/add/edit/remove via mocked hooks). e2e players.spec: signed-out redirected from /players; admin can open it. Server-side write permissions covered by the player_profiles RLS validated in TASK-2.2. 39 unit + 20 e2e green.
<!-- SECTION:NOTES:END -->
