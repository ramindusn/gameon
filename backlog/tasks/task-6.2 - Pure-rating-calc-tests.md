---
id: TASK-6.2
title: Pure rating calc + tests
status: Done
assignee:
  - '@claude'
created_date: '2026-06-19 10:43'
updated_date: '2026-06-22 19:30'
labels:
  - 'size:L'
  - E05
dependencies: []
parent_task_id: TASK-6
ordinal: 33000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pure function computes rating updates from match results; unit tests cover edge cases
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Create packages/domain/src/ranking/:
- glicko2.ts: pure Glicko-2 core (updateGlicko2 over a rating period; Illinois volatility solve; no-games RD inflation capped at default; scale 173.7178, defaults 1500/350/0.06, tau 0.5).
- types.ts: MatchRecord {teamA,teamB,scoreA,scoreB}, RatingPeriod, PlayerRating, PairRating, RatingTables.
- ranking.ts: computeRatings(periods) per ADR 0011 — individual board (each player vs synthetic team-average opponent: rating=mean, rd=RMS), pair board (pair-vs-pair), outcome score = points share. Pre-period snapshot used as opponents; non-playing rated entities decay RD.
- index.ts exports.
Tests: glicko2.test.ts (Glickman worked-example vector r1464/RD151.5/vol0.05999; no-games inflation; symmetry), ranking.test.ts (win raises/loses, bigger margin moves more, pair independence, defaults, multi-period). Run lint+build+unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the pure ranking engine in packages/domain/src/ranking/ per ADR 0011.
- glicko2.ts: canonical Glicko-2 update for one entity over a rating period (scale 173.7178, defaults 1500/350/0.06, tau 0.5), Illinois volatility solve, and idle RD inflation (capped at default RD) when an entity has no games. Validated against Glickman's published worked example (1464.06 / 151.52 / 0.05999).
- types.ts: MatchRecord (teamA/teamB + point scores), RatingPeriod, PlayerRating, PairRating, RatingTables, order-independent pairKey.
- ranking.ts: computeRatings(periods) replays ordered periods. Individual board rates each player vs a synthetic team-average opponent (mean rating, RMS rd); pair board rates partnership-vs-partnership. Outcome score = point share (margin-aware). Opponents read from a pre-period snapshot so match order within a day does not bias results; non-playing rated entities decay (RD up, rating held). Boards sorted strongest-first.
Tests (19): glicko2.test.ts (published vector, win/loss direction, RD shrink/inflate, idle cap, opponent-certainty weighting); ranking.test.ts (scoreShare symmetry/0-0 draw, winner>loser, margin moves more, game counts, order-independence, idle inflation, pair direction/order-independent keys/independent partnerships, empty/multi-period edge cases). Full suite 79 unit pass; lint + build clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Pure Glicko-2 ranking engine in packages/domain/ranking: canonical per-period update (verified against Glickman\x27s worked example) plus computeRatings that derives both the individual board (synthetic team-average opponent) and the per-pair board from margin-aware point-share outcomes, fully order-independent within a period. 19 unit tests cover the algorithm and edge cases.
<!-- SECTION:FINAL_SUMMARY:END -->
