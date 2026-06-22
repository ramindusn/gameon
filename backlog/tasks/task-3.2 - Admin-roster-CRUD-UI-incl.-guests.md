---
id: TASK-3.2
title: Add/manage players (Matchmaker/Admin)
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-19 10:42'
updated_date: '2026-06-22 12:43'
labels:
  - 'size:M'
  - E02
dependencies:
  - TASK-1.5
parent_task_id: TASK-3
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players created/managed by Matchmakers or Admin; no self-service.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admin can add/edit/remove players and guests (name+skill+absent), dual-render list
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
PlayersPage at /players (gated to admin+matchmaker; nav link added for both). Dual-render roster (mobile cards + desktop table) with skill + Matchmaker/Absent badges; add/edit/remove via a modal (name + skill 1-5 + absent). Writes go through RLS (admin/matchmaker of club).
<!-- SECTION:NOTES:END -->
