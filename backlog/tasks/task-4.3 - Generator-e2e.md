---
id: TASK-4.3
title: Generator e2e
status: Done
assignee:
  - '@claude'
created_date: '2026-06-19 10:42'
updated_date: '2026-06-22 18:48'
labels:
  - 'size:S'
  - E03
dependencies:
  - TASK-1.6
parent_task_id: TASK-4
ordinal: 27000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 e2e generates a plan from a seeded roster
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add an E2E seeded-roster bypass in loadRoster() (mirrors the existing isE2E auth bypass): when VITE_E2E=1, return a fixed 8-player roster + fake clubId instead of calling Supabase, so e2e needs no live DB.
2. Add e2e/generate.spec.ts: matchmaker signs in (bypass), navigates to /generate, clicks Generate, asserts the draw renders courts + a present count from the seeded roster.
3. Verify with playwright + lint/build/unit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added e2e/generate.spec.ts (4 cases across chromium + mobile-chrome): signed-out guard on /generate, matchmaker generates a draw from the seeded roster (asserts present count + courts + player names), and mixed-doubles draw. Added an E2E seeded-roster bypass in loadRoster() — when VITE_E2E=1 it returns a fixed 8-player club (4M/4F, skills 1–8) instead of hitting Supabase, mirroring the existing auth bypass, so e2e needs no live DB. Verified: 28 e2e pass (both projects), 51 unit pass, lint + build clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Generator e2e: new e2e/generate.spec.ts drives matchmaker sign-in -> /generate -> draw, asserting courts + sitting from a seeded roster. Added a VITE_E2E roster-seed bypass in loadRoster so the flow runs without Supabase. Verified with full e2e (28), unit (51), lint, and build.
<!-- SECTION:FINAL_SUMMARY:END -->
