---
id: TASK-39
title: >-
  Fold tournament results into Individual+Doubles rankings; remove Fixed Pairs
  board
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-07-12 09:13'
updated_date: '2026-07-12 09:45'
labels:
  - feature
  - ranking
dependencies: []
ordinal: 93000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fixed-pairs tournaments were isolated on their own standings board (ADR 0011/E11). Change: tournament match results now feed the main Individual + Doubles Glicko boards, and the separate 'Fixed Pairs (Tournament)' leaderboard is removed from the UI. Requires: recompute-ratings edge function to include kind='tournament' sessions (not just casual), remove loadTournamentPairBoard/useTournamentPairBoard + the UI cards on Home and LeaderboardPage, and a prod ratings recompute.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 recompute-ratings feeds both casual and tournament finished sessions into player_ratings + pair_ratings
- [x] #2 The 'Fixed Pairs (Tournament)' board is removed from Home and the Leaderboard page
- [x] #3 Prod ratings recomputed (backed up first) so tournament matches are reflected
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
recompute-ratings now feeds all finished sessions (removed kind='casual' filter). Removed loadTournamentPairBoard/useTournamentPairBoard + E2E seed; removed Fixed Pairs cards from Home + LeaderboardPage + tests. Deployed updated function to prod + recomputed (6 periods): tournaments folded into individual+doubles. Backed up to local/backup/prod-ratings-pre-task39-*.json. Verified prod (Nilusha now #1). 197 tests + lint + tsc green. Dev function NOT updated (user scoped to prod).

Merged PR #17 → main; frontend deployed. Prod verified: Fixed Pairs board removed; Individual board shows tournament-folded ratings (Nilusha #1, 1520); Doubles board now includes tournament pairs (Ramboo & Sahan #1, 1581; 54 pairs). No console errors.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Tournament (fixed-pairs) match results now feed the main Individual + Doubles Glicko boards, and the separate 'Fixed Pairs (Tournament)' leaderboard was removed from Home and the Leaderboard page. recompute-ratings edge function updated to include tournament sessions; prod ratings backed up and recomputed. Verified end-to-end.
<!-- SECTION:FINAL_SUMMARY:END -->
