---
id: TASK-29
title: 'Add-match: let matchmaker choose the target round'
status: Done
assignee: []
created_date: '2026-06-28 07:00'
updated_date: '2026-06-28 07:41'
labels:
  - ui-ux
dependencies: []
priority: low
ordinal: 83000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From TASK-26: nextSlot only ever appends a custom match to the highest existing round (Math.max(round)). Let the matchmaker pick which round the new match goes into (default = current/last round), so ad-hoc matches can be added to an earlier round when needed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The add-match form lets the matchmaker choose the target round (defaults to the last round)
- [x] #2 Court number is assigned as the next free court within the chosen round
- [x] #3 The new match renders under the chosen round's card
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AddCustomMatch now takes results[] instead of a precomputed bookedInRound set: it derives existingRounds, offers a Round <select> (testid custom-round) defaulting to the last round with a trailing 'New round N' option, and recomputes booked/eligible players for the selected round (switching rounds clears slots). onAdd is now (round, players); PlayPage computes the court via new nextCourtInRound(results, round) helper (replaces nextSlot). New match renders under its round card via existing groupByRound. Added PlayPage test 'targets a new round, where every player is free again' (round 2 → court 1, p1–p4 selectable again). 181 unit tests pass, lint clean, build OK.
<!-- SECTION:NOTES:END -->
