---
id: TASK-15
title: 'Generate drawer: court count control next to Rounds'
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-26 02:49'
updated_date: '2026-06-27 18:30'
labels: []
dependencies: []
ordinal: 69000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On the Generate page drawer, add a 'Courts' number input next to the existing 'Rounds' input so a matchmaker can choose how many courts the draw uses. Today the court count is auto-derived in the engine as floor(present players / 4) (packages/domain/src/matches/generate.ts) and is not user-controllable; the drawer only exposes Rounds (apps/badminton/src/routes/GeneratePage.tsx). Venues often have fewer courts than players allow, so the matchmaker needs to cap it — extra players sit out / rotate as they already do. Default the field to the auto-derived value so behaviour is unchanged unless the matchmaker lowers it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A 'Courts' number input renders in the Generate drawer immediately next to 'Rounds', matching its styling, with a data-testid (e.g. courts-input)
- [x] #2 The field defaults to the auto-derived court count for the current selected players (floor(present/4)) so default generation output is unchanged
- [x] #3 Matchmaker can set courts from 1 up to the player-supported max (floor(present/4)); out-of-range/invalid input is clamped, mirroring the Rounds input behaviour
- [x] #4 generateRounds honours the chosen court count (caps courts; surplus players sit out/rotate as today) for both 'open' and 'mixed' modes
- [x] #5 The result summary line ('N rounds · M court(s)') reflects the chosen court count
- [x] #6 Domain: GenerateOptions gains an optional courts cap; unit tests cover capping below the auto value and the default (auto) path, for open and mixed
- [x] #7 GeneratePage test asserts the Courts input renders next to Rounds and drives the generated draw
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented courts cap end-to-end. Domain: added optional GenerateOptions.courts plus a capCourts() helper (clamps to [1, autoCourts], ignores values above auto, ignores non-finite); wired through generateOpen and generateMixed. UI: GeneratePage gains a courts-input next to Rounds that defaults to/tracks the auto max (floor(selected/4)) until edited, then clamps; passed into generateRounds and reflected in the 'N rounds · M court(s)' summary. Validation: vitest 19/19 pass (5 new domain cases covering cap-below-auto, default, cap-above-ignored, clamp-to-1, mixed; 1 new GeneratePage case). eslint clean. E2E suite: auth/generate/players specs now pass after the login-helpers refactor; remaining leaderboard/play failures are pre-existing and data-dependent, unrelated to this task.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a user-controllable Courts cap to the Generate drawer. The matchmaker can lower courts from the auto max (floor(present/4)); surplus players sit out/rotate as before. Defaults preserve prior behaviour. Verified with vitest (19/19) and eslint.
<!-- SECTION:FINAL_SUMMARY:END -->
