---
id: TASK-85
title: 'Show shuttle cost on the game-day usage card, and stop saying "from unknown"'
status: To Do
assignee: []
created_date: '2026-08-09 04:23'
labels: []
dependencies: []
priority: medium
ordinal: 151000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The 'Shuttles used' card on a game day says '5 x Victor - from unknown', and shows no money at all. Two separate problems.

## Why it says unknown

Every usage_items row in prod has holder_id null - all 14 of them, newest 26 July. They were written by the old client-side path, which never captured whose stock the shuttles came out of. record_game_day_usage() does write holder_id and refuses to run without a valid holder, but it only landed on 5 August, so nothing recorded so far went through it. Anything recorded from now on names the person.

The old rows are not backfillable: before TASK-69 stock was a club-wide pool with no holder concept, so there is no fact to recover. The fix is to stop the card implying a name is missing when there was never one.

## Cost

purchases is admin-only (purchases_admin, is_admin(club_id)), so a matchmaker cannot compute cost per shuttle in the client. Rather than open the purchases table - which is the club's spend, not a matchmaker's business - expose only the derived unit cost through a security definer function readable by a matchmaker or an admin.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A game day's usage card shows the cost of each line and the total for the day
- [ ] #2 Cost per shuttle matches costPerShuttle() in the domain: weighted average batch price divided by shuttles per barrel
- [ ] #3 A matchmaker sees the cost without being able to read the purchases table
- [ ] #4 A line whose holder was never recorded reads as legacy rather than as a missing name
- [ ] #5 A line recorded through record_game_day_usage still names the holder
<!-- AC:END -->
