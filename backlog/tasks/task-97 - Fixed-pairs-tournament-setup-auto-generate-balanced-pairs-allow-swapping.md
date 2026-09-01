---
id: TASK-97
title: 'Fixed-pairs tournament setup: auto-generate balanced pairs, allow swapping'
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-09-01 07:11'
updated_date: '2026-09-01 07:17'
labels:
  - feature
dependencies: []
ordinal: 163000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TournamentSetup (apps/badminton/src/routes/GeneratePage.tsx ~443) currently has no auto-pairing: the matchmaker taps two players at a time to lock every pair manually, with no use of skill or rating data. The casual draw generator on the same page already balances players using effectiveSkill (manual skill blended with results-based rating, see ranking/effectiveSkill.ts) via the domain matchEngine, but TournamentSetup ignores it entirely.

Add a one-tap 'Auto-pair' action that ranks the selected/pool players by effectiveSkill and locks them via snake pairing (strongest+weakest, 2nd-strongest+2nd-weakest, ...) so every pair ends up similar in combined strength. The matchmaker can then review the generated pairs and, if they judge a pairing unbalanced (skill numbers do not capture everything — e.g. two players who play badly together), correct it by swapping one player from one pair with a player from another pair, without having to unlock and rebuild the whole pairing. The existing unlock (x) affordance and fully-manual tap-to-pair flow must keep working alongside the new auto-pair + swap actions.

Odd numbers of players: auto-pairing should pair as many as it can and leave the remainder in the unpaired pool, same as today.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An 'Auto-pair' action on the tournament setup screen locks all pairable players into pairs using snake pairing over effectiveSkill (strongest with weakest, etc.); with an odd count, one player is left unpaired in the pool
- [x] #2 After auto-pairing, tapping a player in one locked pair then a player in a different locked pair swaps them between their pairs, without touching any other pair
- [x] #3 The existing unlock (x) on a pair and the existing fully-manual tap-two-players-to-lock flow both continue to work, including mixed with auto-generated pairs
- [x] #4 Re-running Auto-pair re-generates pairs from the current pool (any already-locked pairs stay locked unless the matchmaker unlocks them first)
- [x] #5 Unit tests cover the snake-pairing function (even count, odd count, tie-skill ordering) and the swap-between-pairs interaction
- [x] #6 Casual (non-tournament) draw generation is unaffected
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Domain: add packages/domain/src/tournament/snakePairs.ts exporting snakePairs<T extends {skill:number}>(players: T[]): {pairs: [T,T][]; leftover: T[]}. Stable-sort descending by skill, pair index i with n-1-i for i < floor(n/2); an odd count leaves the middle-ranked player as leftover (matches roundRobin's bye pattern). Export from packages/domain/src/index.ts.
2. Domain tests: snakePairs.test.ts covering even count (pair sums are balanced / strongest+weakest), odd count (exactly one leftover, it's the median), and tie-skill input order is preserved (stable sort determinism).
3. App: in GeneratePage.tsx, factor the inline effectiveSkill computation in generate() into a memoized skillOf(id) helper (reads strengthOf + player.skill via effectiveSkill), reuse it for the casual draw, and pass it down as a new skillOf prop to TournamentSetup.
4. TournamentSetup: add an 'Auto-pair' button (Icon name=generate) above/near the player pool, disabled when pool.length < 2. On click: run snakePairs over the current pool (mapped through skillOf) and append the resulting pairs to the existing pairs state; leftover stays in the pool. Re-running it re-pairs only the current pool, leaving already-locked pairs untouched (per AC).
5. TournamentSetup: replace each locked pair's plain name spans with tappable buttons (data-testid swap-{playerId}), add swapPick state ({pairIndex, slot} | null), and a click handler that: deselects on re-tap, selects on first tap, no-ops on a second tap within the same pair, and swaps the two players across pairs (updating pairs state) on a tap in a different pair. Keep the existing unlock (x) and manual tap-to-pair flow unchanged.
6. Update the panel's hint copy to mention Auto-pair and swapping.
7. App tests: extend GeneratePage.test.tsx with auto-pair snake-pairing assertions (even count using the existing 8-player fixture: p1+p8, p2+p7, p3+p6, p4+p5), an odd-count case (deselect one player before opening the panel; one player stays in the pool after Auto-pair), a swap-between-pairs test, and a check that manual lock/unlock still works after Auto-pair.
8. Run domain + app unit tests (npm test / vitest) and typecheck before finalizing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added packages/domain/src/tournament/snakePairs.ts (snakePairs: stable-sort desc by skill, cross-pair i with n-1-i, odd leftover = median), exported from domain index. GeneratePage.tsx: factored skillOf(id) (effectiveSkill over manual skill + rating), passed to TournamentSetup; added Auto-pair button (snakePairs over current pool, appends to existing pairs — already-locked pairs untouched); locked-pair names are now tap targets (swap-{id}) with swapPick state for cross-pair swapping; unlock clears any pending swap selection (indices shift on removal). Verified: packages/domain/src/tournament/snakePairs.test.ts (4 tests: even/odd/tie/empty); apps/badminton/src/routes/GeneratePage.test.tsx gained 5 tests (auto-pair even, auto-pair odd leftover, swap between pairs, re-run auto-pair preserves manual pair, manual lock/unlock still works after auto-pair). Full suite: 459/459 tests pass (vitest run), tsc --noEmit clean, lint clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added an Auto-pair action to the fixed-pairs tournament setup screen (GeneratePage.tsx) that snake-pairs the current unpaired pool by effective skill (rating-blended, same signal the casual draw balancer uses) — strongest with weakest, etc., leaving the median player unpaired on an odd pool. The matchmaker can then tap a player in one locked pair and a player in another to swap them directly, without unlocking either pair; the pre-existing unlock and fully-manual tap-to-pair flow are untouched and interoperate with auto-generated pairs. New domain function packages/domain/src/tournament/snakePairs.ts (4 unit tests). GeneratePage.test.tsx gained 5 tests covering auto-pair (even/odd), swap, re-run-preserves-manual-pairs, and manual lock/unlock after auto-pair. Verified: full vitest suite 459/459 passing, tsc --noEmit clean, lint clean.
<!-- SECTION:FINAL_SUMMARY:END -->
