---
id: TASK-33
title: Per-game-day leaderboard shown on dashboard until the next game day
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-07-09 07:06'
updated_date: '2026-07-11 16:19'
labels:
  - feature
  - ranking
  - dashboard
  - needs-refinement
dependencies: []
priority: medium
ordinal: 87000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a leaderboard scoped to a single game day (standings computed from just that game day's results), and surface it on the dashboard. It should remain displayed until the next game day is created/played, at which point it rolls over to the new game day. This is an initial capture — the user will refine scope (exact ranking metric, which dashboard/audience, tie-breaks, styling) once work starts. IMPORTANT: before implementing, ask the user for the refinements (see AC). Grounding: existing ranking lives in packages/domain/src/ranking + apps/badminton/src/ranking; game-day results come from the play/session model; dashboards exist at MatchmakerHome and the admin dashboard.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A game-day-scoped leaderboard is computed from a single game day's results
- [x] #2 It appears on the dashboard and persists until the next game day supersedes it
- [x] #3 BLOCKER: confirm with the user before building — ranking metric (wins? points? per-day Glicko delta?), which dashboard/audience (matchmaker vs admin vs public home), tie-breaks, and empty state
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. ranking/api.ts: add pure buildGameDayBoard(rows) → per-player {played, wins, diff=net point differential}, sorted by diff desc then playerId (deterministic). Add types GameDayResultRow/GameDayStanding/GameDayBoard.
2. ranking/api.ts: add loadLatestGameDayBoard() — fetch scored casual match_results joined to sessions, pick the session with the max played_at, aggregate its rows. Returns {sessionId, playedAt, standings} or null. Add E2E seed.
3. ranking/useRanking.ts: add useGameDayBoard() query hook.
4. Home.tsx: add a 'Latest Game Day' Section (public home) above RankingPreview — table of Rank | Player | +/- diff, resolving names and applying nickname tie-break; date label via whenLabel; omit when null/empty.
5. Tests: unit-test buildGameDayBoard in api.test.ts; add a Home.test case for the game-day board section.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User explicitly said this task will be refined further once we start: 'I will refine this task more when we started working. Just ask me for more when get this to work.' Do not implement without checking in first.

Refinements confirmed with user: (1) Metric = net point differential (points scored - conceded across the day's matches). (2) Audience = public Home page. (3) Scope = all players who played that day; tie-break by point diff then nickname A→Z. (4) 'The game day' = the most recent casual game day with scored results; rolls over when a newer one has results. Empty state: omit the section when no game day has results yet.

Implemented: buildGameDayBoard (pure, net point diff) + loadLatestGameDayBoard (latest casual game day with scores) in ranking/api.ts; useGameDayBoard hook; LatestGameDay section on public Home above the ranking tables; E2E seed. Tests: 4 buildGameDayBoard unit tests + Home board/empty-state cases. Verified at runtime (VITE_E2E build + Playwright): board renders strongest-first (+34…−35), above rankings, no mobile overflow. tsc + targeted tests green.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a per-game-day leaderboard scoped to the most recent casual game day, ranked by net point differential (points scored − conceded), surfaced as a 'Latest Game Day' section on the public Home page above the ranking tables. Pure buildGameDayBoard aggregator + loadLatestGameDayBoard loader (picks the latest scored game day, so it persists and rolls over automatically) + useGameDayBoard hook. Includes all players who played, tie-break by point diff then nickname A→Z; section hidden until a game day is scored. Refinements (metric/audience/scope) confirmed with user before building. Verified with unit + component tests and a runtime Playwright drive of the built app.
<!-- SECTION:FINAL_SUMMARY:END -->
