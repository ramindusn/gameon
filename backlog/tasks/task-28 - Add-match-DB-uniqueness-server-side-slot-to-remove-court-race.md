---
id: TASK-28
title: 'Add-match: DB uniqueness + server-side slot to remove court race'
status: To Do
assignee: []
created_date: '2026-06-28 07:00'
labels:
  - ui-ux
dependencies: []
priority: low
ordinal: 82000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From TASK-26: nextSlot computes round/court client-side from possibly-stale data.results, so two quick custom-match adds can collide on (session_id, round, court). Add a DB unique index on match_results(session_id, round, court) and/or compute the next slot server-side so concurrent adds can't duplicate a court.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Unique constraint/index on match_results(session_id, round, court) exists via migration
- [ ] #2 Adding two custom matches in quick succession cannot produce two rows with the same (session, round, court)
- [ ] #3 A duplicate-court insert fails gracefully with a user-visible error toast (no silent corruption)
<!-- AC:END -->
