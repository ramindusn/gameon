---
id: TASK-6.3
title: Trigger / Edge Function recompute
status: Done
assignee:
  - '@claude'
created_date: '2026-06-19 10:43'
updated_date: '2026-06-22 19:42'
labels:
  - 'size:M'
  - E05
dependencies:
  - TASK-1.4
parent_task_id: TASK-6
ordinal: 34000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Ratings maintained server-side on result changes (trigger or Edge Function)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Migration ..._ranking.sql:
   - ALTER match_results ADD score_a/score_b smallint (>=0, nullable) for margin-aware ratings.
   - CREATE player_ratings (player_id PK, club_id, rating/rd/volatility/games, updated_at) and pair_ratings (club_id, player1_id<player2_id unique, rating/rd/volatility/games). Glicko-2 defaults 1500/350/0.06.
   - RLS public-read both; grants select to anon/authenticated; only service_role writes (recompute). Indexes (club_id, rating desc).
2. Edge Function recompute-ratings: verify caller admin/matchmaker, then service-role recompute the club's boards from FINISHED sessions (each = one rating period, ordered by created_at) reusing computeRatings from @gameon/domain (relative import). Derive scores from winner when score cols null (degenerate s in {0,1}); full-replace both ratings tables for the club.
3. Wire-up: ranking data layer invokes recompute-ratings on session finish (isE2E guard skips). Server-side maintenance on result changes; DB-trigger/pg_net path noted as deferred prod hardening.
4. Validate: supabase db reset applies migration; npm lint+build+unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Migration 20260622150000_ranking.sql adds match_results.score_a/score_b (margin-aware inputs) plus player_ratings + pair_ratings boards (RLS public-read, service-role-only write, board indexes); validated via supabase db reset and database.types.ts regenerated.

Edge Function supabase/functions/recompute-ratings/index.ts verifies the caller is an admin/matchmaker (anon-key JWT) then, with the service role, replays the club's FINISHED sessions (one session = one rating period, ordered by created_at) through the shared @gameon/domain Glicko-2 engine (computeRatings) — single source of truth, imported via .ts relative path (allowImportingTsExtensions in tsconfig.base.json). Winner-only results degrade to a 1/0 win-share; both boards are full-replaced per club (deterministic/idempotent). Pair rows stored sorted (player1_id<player2_id) to match the schema check + engine pair key.

Wire-up: play/api.ts setSessionStatus invokes recompute-ratings on finish (best-effort; failure logged, does not roll back the finish), guarded by isE2E. Server-side boards are never written by app users (RLS). DB-trigger/pg_net path deferred to TASK-8.3.

Verified: eslint clean, vite build OK, 79 unit tests pass (incl. 19 ranking).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Server-side ranking maintenance: a recompute-ratings Edge Function (admin/matchmaker-gated, service-role) replays a club's finished sessions through the shared Glicko-2 engine and full-replaces the player + pair boards; invoked by the app when a session is finished. Migration adds per-match scores and the two RLS public-read boards.
<!-- SECTION:FINAL_SUMMARY:END -->
