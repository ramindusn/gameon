---
id: TASK-16
title: Seed E2E data so leaderboard/play specs pass under VITE_E2E
status: To Do
assignee: []
created_date: '2026-06-27 18:54'
updated_date: '2026-06-27 19:01'
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
- [ ] #1 e2e/play.spec.ts passes under VITE_E2E=1 without a live Supabase backend
- [ ] #2 e2e/leaderboard.spec.ts passes under VITE_E2E=1 without a live Supabase backend
- [ ] #3 Seeding/stubbing is deterministic (no flakiness across chromium + mobile-chrome projects)
- [ ] #4 npm run verify is fully green locally and in CI
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The 5 affected specs are currently marked test.fixme() referencing TASK-16 (commit 3abefa6 on feat/generate-court-count): e2e/leaderboard.spec.ts 'View all opens the full leaderboard with both boards'; e2e/play.spec.ts 'matchmaker starts a session...', 'matchmaker sets a game-day date...', 'matchmaker edits a line-up...', 'public home surfaces scheduled matches and recent results'. Remove the test.fixme markers (restore test()) as part of this task once seeding is in place.
<!-- SECTION:NOTES:END -->
