# ADR 0012 — Tournament results feed the main boards; no separate Fixed Pairs leaderboard

**Status:** Accepted (2026-07). Supersedes the E11 decision to isolate fixed-pairs
tournaments on their own standings board (see [ADR 0011](0011-ranking-glicko2.md)
for the shared Glicko-2 engine).

## Context
Fixed-pairs tournaments (E11) were originally **isolated**: their matches did not
touch the Individual/Doubles Glicko boards and instead fed a separate **"Fixed
Pairs (Tournament)"** leaderboard, computed on read over `kind='tournament'`
sessions only.

In practice this split confused more than it helped. A tournament is still real
doubles play — the same people, the same courts, real point scores — so keeping
those results out of the main rankings made a player's overall standing feel
incomplete, and the extra board added noise to Home and the Leaderboard page.

## Decision
**Tournament matches feed the main Individual + Doubles boards**, exactly like
casual game days, and the **separate Fixed Pairs leaderboard is removed**.

- `recompute-ratings` replays **all finished sessions** (casual **and**
  tournament) as rating periods — the `kind='casual'` filter is dropped.
- One finished session = one rating period, in chronological order (unchanged).
- `kind` still distinguishes the two elsewhere: the play view keeps its
  "Tournament" tag, and the public home's **Game Day Podium stays casual-only**
  (it is about casual game days, not tournaments).
- The `loadTournamentPairBoard` / `useTournamentPairBoard` read path and the UI
  cards were deleted.

## Consequences
- One coherent set of rankings: a player's Individual/Doubles rating reflects
  **everything** they played, tournaments included.
- Applying this to a live environment is a **ratings recompute** (the engine
  replays from scratch), not a schema change. Prod was backed up and recomputed;
  ratings shifted as tournament results were folded in.
- Tournament fixed pairs now appear on the Doubles board like any other pair
  (often provisional / high-RD, since a pair plays few games).
- The `kind` column and the tournament creation flow (E11) are unchanged — only
  where the results are *counted* changed.

See TASK-39.
