---
id: TASK-10.4
title: 'Live line-up editing, custom matches, and delete match'
status: To Do
assignee: []
created_date: '2026-06-22 20:39'
labels:
  - E09
  - 'size:M'
dependencies:
  - TASK-10.1
parent_task_id: TASK-10
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Let the matchmaker adjust a live game day's matches. Add play data-layer ops: updateMatchLineup(resultId, teamA[2], teamB[2]) for full substitution from the present roster (covers partner swaps like AB vs CD -> AC vs BD and substituting a different player); addCustomMatch(sessionId, players) to insert an ad-hoc match when the draw runs low; deleteMatch(resultId) to drop a match that won't be played. PlayPage UI exposes editing a match's four slots (pick from present roster), adding a custom match, and deleting a match. All edits are blocked once the game day is finished. Validate that a player cannot appear twice in the same match.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On a live game day the matchmaker can replace any of a match's four players with any present player (partner swap or full substitution)
- [ ] #2 The matchmaker can add a custom/ad-hoc match by choosing four players when the draw runs low
- [ ] #3 The matchmaker can delete a match (e.g. one that will not be played)
- [ ] #4 Editing, adding, and deleting matches is blocked once the game day is finished
- [ ] #5 A player cannot appear twice in the same match (validation with a clear message)
<!-- AC:END -->
