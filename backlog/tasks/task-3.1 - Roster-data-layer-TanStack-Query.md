---
id: TASK-3.1
title: Roster data layer (TanStack Query)
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-19 10:42'
updated_date: '2026-06-22 12:43'
labels:
  - 'size:S'
  - E02
dependencies: []
parent_task_id: TASK-3
ordinal: 21000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Query/mutation hooks for list/add/update/remove players
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
roster/api.ts + useRoster.ts: TanStack Query loadRoster (public read of player_profiles + resolveClubId for the acting admin/matchmaker) and add/update/remove mutations that invalidate ['roster']. mapRow maps DB rows -> Player {nickname, skill, absent, isMatchmaker, hasLogin}.
<!-- SECTION:NOTES:END -->
