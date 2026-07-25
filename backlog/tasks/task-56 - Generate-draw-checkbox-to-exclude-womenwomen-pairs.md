---
id: TASK-56
title: 'Generate draw: checkbox to exclude women+women pairs'
status: Done
assignee: []
created_date: '2026-07-25 19:33'
updated_date: '2026-07-25 19:39'
labels:
  - frontend
  - domain
dependencies: []
ordinal: 110000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On the Generate Draw screen (apps/badminton/src/routes/GeneratePage.tsx), add an 'Exclude women's pairs' checkbox next to the existing Rounds/Courts controls, default unchecked. When checked, the doubles generator (packages/domain/src/matches/generate.ts, generateOpen path — the only generation path actually reachable from the UI today, since 'mode' is hardcoded to 'open' with no mixed-mode toggle) should avoid placing two players who are both gender='female' on the same team. This is a soft/best-effort constraint, not a hard rule: skip a women+women pairing whenever a valid alternative exists (including trying alternate court/team combinations), but allow one if the round's gender ratio makes it truly unavoidable (e.g. an all-or-mostly-female group, or an odd number of women left over after men are paired off). Gender is already on every player (player_profiles.gender, MatchPlayer.gender) so no schema change is needed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Generate Draw screen shows an 'Exclude women's pairs' checkbox alongside Rounds/Courts, default unchecked
- [x] #2 When checked, generateRounds/generateOpen prefers pairings with no women+women team, trying alternate pairing combinations before falling back to one
- [x] #3 When checked but a women+women pair is unavoidable given the round's gender mix, the generator still produces a full draw with one (does not bench a player or fail generation)
- [x] #4 The sequential fallback pairing path (used when scored optimization can't find a valid arrangement) also respects the flag, not just the primary scored path
- [x] #5 When unchecked, behavior is unchanged from current (women+women pairs allowed exactly as before)
- [x] #6 Players with gender null or 'other' are unaffected by this constraint — only pairs of two 'female' players are avoided
- [x] #7 Unit tests in packages/domain cover: flag off allows a women+women pair when it's the best skill match; flag on avoids one when an alternative exists; flag on still produces a full draw (no bench/failure) when a women+women pair is unavoidable
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add GenerateOptions.excludeWomensPairs?: boolean to packages/domain/src/matches/types.ts.
2. In packages/domain/src/matches/generate.ts (open-mode path):
   - Thread excludeWomensPairs through scoreMatch -> scoreCourt -> searchCourts2/searchCourts3 -> assignCourts -> generateOpen -> generateRounds (opts.excludeWomensPairs). Do NOT hard-block (return Infinity) on a woman+woman team, since that can make an entire court group infeasible and collapse quality for unrelated courts in the same round. Instead add a large finite penalty (e.g. 100000) to the score whenever a team is two 'female' players, on top of the existing skill/partner/rematch scoring. This makes the search strongly prefer non-FF pairings while still returning a valid best-effort result when one court's gender mix makes an FF pair unavoidable (soft constraint per user decision).
   - Fix the sequential fallback (used whenever the scored search can't find a result, which today is ALWAYS the path for courts >= 4 since searchCourts2/3 only cover 2-3 courts): replace the blind [[g0,g1],[g2,g3]] split with a small splitFour() helper that tries the 3 possible team splits of a 4-player group and picks a non-FF/non-FF split when excludeWomensPairs is set and one exists, else falls back to the default split (identical output to today when the flag is off).
3. In apps/badminton/src/routes/GeneratePage.tsx: add excludeWomensPairs state (default false), a checkbox next to the Rounds/Courts fields ('Avoid women+women pairs'), and pass it into generateRounds(present, rounds, { mode, courts, excludeWomensPairs }).
4. Add unit tests in packages/domain/src/matches/generate.test.ts: flag off allows an FF pair when it's the best skill match; flag on avoids an FF pair when a valid alternative exists; flag on still returns a full draw (no bench/failure, no thrown error) when an FF pair is mathematically unavoidable given the gender mix (e.g. lopsided female-heavy group), including a courts>=4 case that exercises the fixed fallback path.
5. Run pnpm -F @gameon/domain test and relevant badminton app checks; update backlog AC + notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented: GenerateOptions.excludeWomensPairs threaded through generateOpen's scored path (scoreMatch/scoreCourt/searchCourts2/3/assignCourts) as a large finite penalty (100000) added to the existing score rather than a hard Infinity block, so a single unavoidable court doesn't collapse quality for the rest of the round. Also fixed the sequential fallback (the only path used for courts>=4, since searchCourts2/3 only cover 2-3 courts) with a new splitFour() helper that tries the 3 team splits of each quartet and prefers one with no woman+woman team, matching the same best-effort semantics. UI: checkbox 'Avoid women+women pairs' added to GeneratePage.tsx next to Rounds/Courts, default unchecked, wired into generateRounds(). Verified: 5 new unit tests in generate.test.ts (flag off allows FF pair at best skill match; flag on avoids it when an alternative exists; flag on still returns a full draw with no bench/failure when unavoidable (1M+3F single court); fallback path (courts=4) both forces an unavoidable FF pair in one quartet and avoids one in another; flag off leaves fallback's default split unchanged). Full domain suite (108 tests) and badminton app tsc --noEmit both pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a best-effort 'Avoid women+women pairs' checkbox to the Generate Draw screen. When checked, the open-mode doubles generator strongly prefers non-FF team splits (via a large scoring penalty, not a hard block) and falls back to allowing one only when a round's gender mix makes it truly unavoidable — never benching a player or failing generation. Applies across both the scored search (2-3 courts) and the sequential fallback (4+ courts), which previously had no gender awareness at all. Verified with 5 new unit tests plus the full domain suite and a typecheck.
<!-- SECTION:FINAL_SUMMARY:END -->
