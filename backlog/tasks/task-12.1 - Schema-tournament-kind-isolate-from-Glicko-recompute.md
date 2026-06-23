---
id: TASK-12.1
title: 'Schema: tournament kind + isolate from Glicko recompute'
status: Done
assignee: []
created_date: '2026-06-23 12:37'
updated_date: '2026-06-23 12:39'
labels:
  - E11
dependencies: []
parent_task_id: TASK-12
ordinal: 63000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 match_sessions has a kind ('casual'|'tournament') column; recompute-ratings and recent-form exclude tournament sessions
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added migration 20260623000000_tournament_kind.sql (match_sessions.kind 'casual'|'tournament', default casual, + club/kind index). recompute-ratings now filters finished sessions to kind='casual'; loadRecentForm joins+filters kind='casual'. Tournament play is excluded from the Glicko boards + casual form. NOTE: migration not yet applied to the remote DB (awaiting approval).
<!-- SECTION:NOTES:END -->
