---
id: TASK-29
title: 'Add-match: let matchmaker choose the target round'
status: To Do
assignee: []
created_date: '2026-06-28 07:00'
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
- [ ] #1 The add-match form lets the matchmaker choose the target round (defaults to the last round)
- [ ] #2 Court number is assigned as the next free court within the chosen round
- [ ] #3 The new match renders under the chosen round's card
<!-- AC:END -->
