---
id: TASK-16
title: Seed E2E data so leaderboard/play specs pass under VITE_E2E
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-27 18:54'
updated_date: '2026-07-08 15:02'
labels: []
dependencies: []
ordinal: 70000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Playwright suite has pre-existing failures in e2e/leaderboard.spec.ts and e2e/play.spec.ts that are independent of auth/routing. Under VITE_E2E=1 the auth bypass resolves roles without Supabase, but the play and leaderboard flows assert on real data (e.g. a finished result showing 'Winner', scheduled matches on the public home, leaderboard rows) that the bypass does not seed. These tests fail on main as well as on feat/generate-court-count, so they block 'npm run verify' from being fully green. Investigate how the data layer behaves under VITE_E2E and provide deterministic seeded fixtures (or stub the play/leaderboard queries) so these specs pass without a live backend.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 e2e/play.spec.ts passes under VITE_E2E=1 without a live Supabase backend
- [x] #2 e2e/leaderboard.spec.ts passes under VITE_E2E=1 without a live Supabase backend
- [x] #3 Seeding/stubbing is deterministic (no flakiness across chromium + mobile-chrome projects)
- [x] #4 npm run verify is fully green locally and in CI
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The 5 affected specs are currently marked test.fixme() referencing TASK-16 (commit 3abefa6 on feat/generate-court-count): e2e/leaderboard.spec.ts 'View all opens the full leaderboard with both boards'; e2e/play.spec.ts 'matchmaker starts a session...', 'matchmaker sets a game-day date...', 'matchmaker edits a line-up...', 'public home surfaces scheduled matches and recent results'. Remove the test.fixme markers (restore test()) as part of this task once seeding is in place.

Root cause: the 5 specs were parked before the e2eStore + ranking E2E seeds landed; seeding already works, the specs had just drifted from the current UI. Fixes: (1) removed test.fixme markers; (2) reconciled play.spec assertions with real nav — finish→/leaderboard, delete→/matchmaker, session history now via matchmaker recent-/live- lists (old 'sessions'/'session-$id' testids no longer exist); (3) de-duplicated the leaderboard pair-board testid (doubles + fixed-pairs both used it) by adding testid/rowPrefix props to PairBoardList; tournament board now tournament-pair-board; (4) added sr-only ' — Winner' label to the winning team in Home Recent Results (a11y: winner was color-only) so it's assertable. Full verify green: lint clean, 181 unit, 42 e2e (was 32 passed + 10 skipped) across chromium + mobile-chrome. Separately split CI into parallel lint-unit-build + e2e jobs.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Un-parked the 5 data-dependent play/leaderboard e2e specs. Seeding was already in place (e2eStore + ranking E2E boards); the specs had simply drifted from the current UI, so this was reconciliation not new fixtures. Restored test() from test.fixme(); updated play.spec to the real navigation (finish→/leaderboard, delete→/matchmaker) and session-history lookups via the matchmaker recent-/live- lists; de-duplicated the leaderboard pair-board testid via new testid/rowPrefix props on PairBoardList (fixed-pairs board now tournament-pair-board); and added an sr-only Winner label to the winning team in Home Recent Results (also fixes a color-only-winner a11y gap). Verified: npm run verify fully green — lint clean, 181 unit tests, 42 e2e (chromium + mobile-chrome), 0 skipped (was 32 passed + 10 skipped).
<!-- SECTION:FINAL_SUMMARY:END -->
