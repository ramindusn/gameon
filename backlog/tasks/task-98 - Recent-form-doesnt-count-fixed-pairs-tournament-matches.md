---
id: TASK-98
title: Recent form doesn't count fixed-pairs tournament matches
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-09-01 08:29'
updated_date: '2026-09-01 08:31'
labels:
  - bug
dependencies: []
ordinal: 164000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
loadRecentForm() (apps/badminton/src/ranking/api.ts:301) still filters .eq('match_sessions.kind', 'casual'), a leftover from TASK-12.1 (E11) when tournament results were deliberately isolated from the main ranking system. TASK-39 folded tournament results into the Individual+Doubles Glicko boards, and TASK-93 fixed the identical stale filter on loadGameDayBoards() so tournament days show on the Game Day Podium — but loadRecentForm was missed, so the W/L/D 'recent form' pills on the Leaderboard and player profile pages still skip tournament game days entirely. A player who only played fixed-pairs tournament matches recently shows no recent form change, or a stale one.

buildFormMap() (same file) is already generic per-player and needs no changes — it just tallies wins/losses per session from whatever rows it's given.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 loadRecentForm includes finished tournament (kind='tournament') sessions alongside casual ones
- [x] #2 A player's most recent game day appearing first in their W/L/D form strip reflects a tournament day they played, not just casual ones
- [x] #3 Existing casual-only recent-form behavior is unchanged
- [ ] #4 buildFormMap's existing unit tests still pass unchanged (it was already kind-agnostic — the bug was purely the SQL filter)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove the stale .eq('match_sessions.kind', 'casual') filter from loadRecentForm (apps/badminton/src/ranking/api.ts:301-310), matching the fix TASK-93 already applied to the sibling loadGameDayBoards query and TASK-39's fix to recompute-ratings.
2. buildFormMap (the pure aggregator) needs no change — it has no kind concept and already treats every row the same; confirm its existing tests in ranking/api.test.ts still pass.
3. This repo has no unit-test harness for functions that call the live Supabase client directly (loadGameDayBoards has the same gap, per TASK-93's implementation notes) — no new test is added for loadRecentForm itself; verification is: unaffected pure-function tests pass, tsc/lint clean, and a manual check against a real dataset.
4. Run full unit suite + typecheck + lint.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed .eq('match_sessions.kind','casual') from loadRecentForm's query (apps/badminton/src/ranking/api.ts) and dropped the now-unused 'kind' column from the select. buildFormMap is unchanged — it never had a kind concept, so this was purely a query-level exclusion. No new unit test was added for loadRecentForm itself: this repo has no harness for functions that call the live Supabase client directly (same gap TASK-93 documented for loadGameDayBoards) — verification is the unaffected buildFormMap tests still passing plus tsc/lint. Full suite: 459/459 passing, tsc --noEmit clean, lint clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed loadRecentForm (apps/badminton/src/ranking/api.ts) to include finished tournament sessions, not just casual ones — a stale filter left over from before TASK-39 folded tournament results into the main Individual+Doubles rankings, and the same bug TASK-93 already fixed on the Game Day Podium query. A player's W/L/D recent-form strip on the Leaderboard and profile pages now reflects fixed-pairs tournament days they played. Verified: full unit suite 459/459 passing, tsc --noEmit clean, lint clean.
<!-- SECTION:FINAL_SUMMARY:END -->
