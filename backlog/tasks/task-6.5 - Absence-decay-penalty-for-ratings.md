---
id: TASK-6.5
title: Absence decay penalty for ratings
status: To Do
assignee: []
created_date: '2026-06-22 19:53'
labels:
  - E05
  - 'size:M'
dependencies:
  - TASK-6.3
parent_task_id: TASK-6
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players must keep playing game days to retain their ranking: if a player is absent on a finished game day, apply a minus-point penalty / rating decay so inactive players drift down the boards (active play is required to hold position). Requested by product owner alongside the leaderboard.

Open design points (resolve in the task's ADR/plan): the roster 'absent' flag on player_profiles is mutable current-state, NOT historical per session — to penalize absence on a specific past game day we must RECORD ATTENDANCE per session/game day (who was present vs absent when the session was finished). Then extend the Glicko-2 recompute so each rating period also processes absentees as a penalty (e.g. a fixed minus-points decay and/or RD inflation), distinct from the engine's existing idle-RD inflation. Update ADR 0011 and the recompute-ratings Edge Function accordingly; surface decay in the leaderboard.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Attendance (present/absent) is recorded per finished game day so absence is historical, not just current roster state
- [ ] #2 Absent players on a finished game day receive a rating penalty / decay during recompute (active play required to retain ranking)
- [ ] #3 ADR 0011 updated to document the absence-decay rule; recompute and boards reflect it
<!-- AC:END -->
