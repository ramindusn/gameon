---
id: TASK-87
title: 'Make the live ranking column show the real calculation, not a running tally'
status: To Do
assignee: []
created_date: '2026-08-09 07:11'
labels: []
dependencies: []
priority: high
ordinal: 153000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
While a game day is live, the Standings' Ranking column shows an indicative tally: MATCH_POINTS_K/2 (8 points) added per win and subtracted per loss, summed over the day. Once the day is finished it switches to the real Glicko-2 delta, and the number collapses.

Measured on the biggest finished game day (31 matches), projected vs real:
  +56.0 -> +7.2, +32.0 -> +7.7, +32.0 -> +10.5, -40.0 -> -3.1, -80.0 -> -41.5

The scale gap alone would be tolerable. The real problem is that the tally only counts wins and losses, while Glicko-2 also weighs opponent and partner strength - so the two can disagree in DIRECTION:
  0.0 projected -> +8.7 real     (broke even against strong opposition, actually climbed)
  +8.0 projected -> -2.2 real    (won more than lost, actually slipped)

A number that points the wrong way is worse than no number. Relabelling it 'projected' would caveat a misleading figure rather than fix it.

loadGameDayRatingDeltas already replays every finished day through computeRatings to get a real delta; it excludes the live one only because it filters on status='finished'. Including the in-progress day as the final rating period gives the true projected delta, updating as matches are scored, landing exactly on the finished value instead of jumping to it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 While a game day is live, the Ranking column shows the Glicko-2 delta the day would produce if it finished now
- [ ] #2 The number updates as matches are scored
- [ ] #3 Finishing a game day does not change the figure (no jump), given the same scored matches
- [ ] #4 The live day is rated as the most recent period, after every finished day, so history is not reordered
- [ ] #5 An unscored game day shows zero movement rather than a spurious delta
- [ ] #6 The court cards' per-match figure still reconciles with the column, or is reconciled deliberately
<!-- AC:END -->
