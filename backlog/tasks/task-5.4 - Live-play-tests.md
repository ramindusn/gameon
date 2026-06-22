---
id: TASK-5.4
title: Live play tests
status: Done
assignee:
  - '@claude'
created_date: '2026-06-19 10:43'
updated_date: '2026-06-22 19:16'
labels:
  - 'size:S'
  - E04
dependencies: []
parent_task_id: TASK-5
ordinal: 31000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Unit/e2e cover session create + winner recording + permissions
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add play/e2eStore.ts: in-memory Map-based sessions/results store (e2eUid, e2ePut, e2eList, e2eGet, e2eSetResult, e2eSetStatus) importing only TYPES from play/api.ts.
2. Branch play/api.ts CRUD fns on isE2E() to use the store (no Supabase in E2E).
3. Write e2e/play.spec.ts: matchmaker start session -> record winner -> finish -> appears in history; plus signed-out cannot reach /play and /play/:id.
4. Run e2e + lint + build + unit.
5. Finalize TASK-5.4 (check AC#1, notes, summary, Done); close epic TASK-5.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added e2e/play.spec.ts covering the full live-play flow: matchmaker generates a draw, starts a session (live), records a court winner, finishes the session, and finds it in history (then reopens to confirm the winner persisted). A second test asserts signed-out visitors cannot reach /play or /play/:id (ProtectedRoute bounce). Match-play in E2E uses a sessionStorage-backed in-memory store (apps/badminton/src/play/e2eStore.ts) because the real Supabase client is null under VITE_E2E=1; play/api.ts branches each CRUD fn on isE2E(). sessionStorage persistence lets the test survive full page reloads (works on both chromium and mobile-chrome where the top nav is hidden). Unit (60) + e2e (32, incl. 2 new play specs x2 projects) pass; lint + build clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Live-play e2e coverage: session create + winner recording + permission guard, backed by a sessionStorage E2E store so play/api.ts runs without Supabase under VITE_E2E.
<!-- SECTION:FINAL_SUMMARY:END -->
