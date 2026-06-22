---
id: TASK-6.4
title: Leaderboard UI
status: Done
assignee:
  - '@claude'
created_date: '2026-06-19 10:43'
updated_date: '2026-06-22 20:01'
labels:
  - 'size:M'
  - E05
dependencies:
  - TASK-1.5
parent_task_id: TASK-6
ordinal: 35000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Ranked player list with rating + recent form
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Data layer apps/badminton/src/ranking/api.ts: read the persisted public boards (player_ratings, pair_ratings) — RatedPlayer/RatedPair camelCase types + mappers; loadPlayerBoard()/loadPairBoard() ordered rating desc; resolve player_id -> nickname via roster Map. Recent form = last 10 finished game-day (session) results per player from match_results (W/L), newest-first. isE2E() guard returns seeded boards+form from a ranking e2eStore so the public Home/leaderboard render in E2E.
2. Hooks apps/badminton/src/ranking/useRanking.ts: useQuery hooks (['ratings','players'] / ['ratings','pairs'] / form).
3. UI: a shared Leaderboard list component (rank #, name(s), rating, games, form pills W/L). Replace the two Home placeholder Cards (Doubles + Individual) with top-N previews + 'View all' link. New public route /leaderboard (own header/footer like PlayerProfilePage, no AppShell) showing full Individual + Doubles boards; add route to App.tsx and make Home 'Leaderboards' nav + card actions link to it.
4. Tests: ranking/api.test.ts for mappers + form derivation; Leaderboard component/route test (mock hooks) following SessionsPage.test.tsx; extend e2e/home.spec.ts or add leaderboard.spec.ts.
5. Validate: lint + build + unit + e2e.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Leaderboard reads the public ratings boards the recompute Edge Function maintains (no client-side compute). New feature module apps/badminton/src/ranking: api.ts (RatedPlayer/RatedPair mappers, loadPlayerBoard/loadPairBoard ordered rating desc, loadRecentForm), useRanking.ts hooks (usePlayerBoard/usePairBoard/useRecentForm + usePlayerNames reusing the roster id->nickname Map), and Leaderboard.tsx presentational components (PlayerBoardList/PairBoardList/FormStrip/BoardState, provisional PROV badge when rd>150).

Recent form: buildFormMap (pure) collapses finished court results into per-player, per-game-day W/L/D, newest-first, capped at 10 (FORM_LIMIT) — interpreting the product owner's 'last 10 game day results'.

UI: new public /leaderboard route (LeaderboardPage, own header like PlayerProfilePage, no AppShell) showing full Individual + Doubles boards; Home placeholder cards replaced with top-5 previews + 'View all' links; Home 'Leaderboards' nav now routes to /leaderboard. App.tsx wires the public route.

E2E seed: api.ts ships a deterministic 8-player board + pairs + form for VITE_E2E builds (client is null), mirroring the roster seed, so the public Home + /leaderboard render real rows under Playwright.

Out of scope (tracked as TASK-6.5): the absence/minus-point decay the owner asked for is a ranking-rule + attendance-history change to the engine/recompute, not the UI.

Verified: eslint clean, build OK, 89 unit tests (16 new: api mappers+buildFormMap, LeaderboardPage), 38 e2e (6 new leaderboard).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Public leaderboards: a new ranking feature module reads the persisted individual + per-pair Glicko-2 boards and derives each player's recent game-day form (last 10, W/L/D). Home's placeholder cards become live top-5 previews with 'View all' links to a new public /leaderboard route showing both full boards, with provisional badges for high-RD players.
<!-- SECTION:FINAL_SUMMARY:END -->
