---
id: TASK-86
title: 'Show who created a game day, on the game day and in the list'
status: To Do
assignee: []
created_date: '2026-08-09 04:44'
labels: []
dependencies: []
priority: medium
ordinal: 152000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
match_sessions.created_by has existed all along and is null on all 12 sessions in prod, including the one running now - nothing ever wrote it, and SESSION_COLS never selected it back.

Filling it from the client would only cover the one insert path that exists today. A column default of auth.uid() covers every path, including any added later, and cannot be forgotten at a call site.

Not backfillable: match_results and session_attendance carry no creator either, so there is no trail to recover for existing game days. They will show nothing, and only games created from now on will name anyone - the same honest limit as the usage holder in TASK-85.

player_profiles is publicly readable (player_profiles_public_read, qual true), so the name resolves for signed-out visitors on the public game-day page too.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A new game day records who created it, without the client having to remember to send it
- [ ] #2 The game-day header names the creator in small text
- [ ] #3 Each row of All game days names the creator in small text
- [ ] #4 A game day with no recorded creator shows nothing rather than a placeholder
- [ ] #5 The name resolves for a signed-out visitor on the public game-day page
<!-- AC:END -->
