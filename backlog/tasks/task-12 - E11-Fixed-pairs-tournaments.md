---
id: TASK-12
title: E11 - Fixed-pairs tournaments
status: Done
assignee: []
created_date: '2026-06-23 12:36'
updated_date: '2026-06-23 13:01'
labels: []
dependencies: []
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run fixed-pairs doubles tournaments (user-defined teams, no draw engine) with an isolated leaderboard ranked by total points scored, with an absence penalty. Tournament play is excluded from the individual + Glicko doubles ranking.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tournament sessions are isolated from the Glicko boards; a combined Fixed Pairs leaderboard ranks pairs by total points scored with an absence penalty
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
E11 shipped. Migration 20260623000000_tournament_kind.sql applied to remote (kind column live, existing day backfilled to casual); recompute-ratings redeployed to exclude tournament sessions. Fixed-pairs tournaments: create empty tournament game day, build pair-vs-pair fixtures via existing custom-match flow, isolated 'Fixed Pairs' leaderboard ranked by total points with per-missed-day absence penalty. 161 tests green; lint+build clean.
<!-- SECTION:NOTES:END -->
