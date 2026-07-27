---
id: TASK-59
title: Add TypeScript coverage for test files (currently never type-checked)
status: Done
assignee: []
created_date: '2026-07-27 19:48'
updated_date: '2026-07-27 19:52'
labels:
  - chore
  - tooling
dependencies: []
ordinal: 113000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Confirmed by injecting a deliberate type error into a packages/domain test file: npm run lint, npm test, and npm run build all pass clean. Root cause: apps/badminton/tsconfig.json explicitly excludes **/*.test.ts(x)/spec.ts(x) (by design, so the production build doesn't pull in test-only deps); packages/domain, packages/ui, packages/supabase have no tsconfig.json of their own, so their files are only type-checked when transitively reachable via the app's path-alias imports; and vitest runs tests through esbuild (type-stripping) rather than tsc, so 'npm test' never type-checks anything. Net effect: every *.test.ts(x) in the repo, plus any file only imported by tests (e.g. packages/domain/src/fund/fixtures.ts, packages/domain/src/matches/fixtures.ts), has zero type-checking coverage from any command, locally or in CI. Fix: add a dedicated typecheck config/script that covers app src+tests, package src+tests, and e2e, without touching the existing production build config (which should stay lean and test-free).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A new root-level tsconfig covers apps/**/src, packages/**/src, e2e/**, playwright.config.ts, and vitest.setup.ts, including test/spec files (not excluded)
- [x] #2 A new 'typecheck' script in root package.json runs tsc --noEmit against that config
- [x] #3 npm run typecheck fails on a deliberate type error placed in a *.test.ts file (verified, then reverted) and passes on the current clean codebase
- [x] #4 'verify' script and CI (ci.yml lint-unit-build job) both run typecheck
- [x] #5 apps/badminton/tsconfig.json (the production build config) is unchanged — still excludes tests, still used by 'npm run build'
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added tsconfig.typecheck.json (extends tsconfig.base.json, same @gameon/* path aliases as apps/badminton/tsconfig.json, types: vite/client+node+@playwright/test) covering apps/**/src, packages/**/src, e2e/**, playwright.config.ts, vitest.setup.ts — test/spec files included this time. Added 'typecheck' script + wired into 'verify' and ci.yml's lint-unit-build job, right after lint. Running it against the (previously never-checked) codebase surfaced 4 REAL pre-existing type errors: apps/badminton/src/play/api.test.ts had 3 stale fixtures missing fields added to MatchSession/MatchResult by later work (played_at, score_a/score_b) and apps/badminton/src/profile/PerformanceChart.test.tsx's fixture was missing sessionId (added by TASK-55). Fixed all 4 by updating the test fixtures/expectations to match the current shapes (not by loosening types). Verified the enforcement itself works: planted a deliberate type error in a throwaway test file, confirmed 'npm run typecheck' fails on it, removed it, confirmed it passes again. Full lint+typecheck+build clean; vitest suite passes except the pre-existing unrelated PlayerProfilePage timezone failure (also fails on main, unrelated to this change).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added tsconfig.typecheck.json + 'npm run typecheck' (wired into verify + CI) to close a real gap: no test file anywhere in the repo was ever type-checked by any existing command. Enforcing it surfaced and required fixing 4 genuine pre-existing type errors in stale test fixtures (play/api.test.ts, PerformanceChart.test.tsx) that had silently drifted out of sync with their real types. Production build config (apps/badminton/tsconfig.json) untouched.
<!-- SECTION:FINAL_SUMMARY:END -->
