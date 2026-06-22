---
id: TASK-10.2
title: 'Create game day from a reviewed draw (editable date/time, edit/delete)'
status: To Do
assignee: []
created_date: '2026-06-22 20:39'
labels:
  - E09
  - 'size:M'
dependencies:
  - TASK-10.1
parent_task_id: TASK-10
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make persisting a game day an explicit, reviewable step and let the matchmaker manage it. On GeneratePage, generating a draw stays a client-side preview; after reviewing it the matchmaker presses 'Create game day' to persist the session + match rows, choosing a date/time that defaults to the current date/time. The matchmaker can edit an existing game day's date/time and delete a game day (with a confirm) if something is wrong. Surface the game-day date/time in the sessions list and the play view. Rename the user-facing copy from 'session' to 'game day' across generate/play/sessions screens.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Generating a draw is a client-only preview; the game day persists only when the matchmaker confirms 'Create game day'
- [ ] #2 Before creating, the matchmaker can set/adjust the game day's date and time (defaults to current date/time)
- [ ] #3 The matchmaker can edit the date/time of an existing game day
- [ ] #4 The matchmaker can delete a game day (with confirm); it leaves the list and does not contribute to ranking
- [ ] #5 Game-day date/time is shown in the sessions list and the play view; user-facing copy says 'game day'
<!-- AC:END -->
