---
id: TASK-5.2
title: matchPlay data layer
status: Done
assignee:
  - '@claude'
created_date: '2026-06-19 10:43'
updated_date: '2026-06-22 19:05'
labels:
  - 'size:S'
  - E04
dependencies: []
parent_task_id: TASK-5
ordinal: 29000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create session from a plan; list sessions; get/set results
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. play/api.ts: Session/Result domain types + row mappers; pure planToResultRows(plan, sessionId, clubId) that flattens GeneratedMatches rounds/courts into match_results rows (1-based round/court, 4 player ids, winner null). Supabase CRUD: createSessionFromPlan (insert session -> insert results), listSessions, getSession (session + results), setResult(winner), finishSession.
2. play/useMatchPlay.ts: TanStack Query hooks (useSessions, useSession, useCreateSession, useSetResult, useFinishSession) with cache invalidation, mirroring roster/useRoster.
3. play/api.test.ts: unit-test the pure mappers + planToResultRows.
4. lint + build + unit green.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added play/api.ts (data access mirroring roster/api): domain types (MatchSession/MatchResult/Side), row mappers, and a pure planToResultRows() that flattens GeneratedMatches into match_results inserts (1-based round/court, 4 player ids). Supabase ops: createSessionFromPlan (insert session -> bulk-insert result rows, returns id), listSessions, getSession (session + ordered results), setResult(winner a/b/null), setSessionStatus(live/finished). Added play/useMatchPlay.ts with TanStack Query hooks (useSessions, useSession, useCreateSession, useSetResult, useSetSessionStatus) + cache invalidation. play/api.test.ts covers the pure mappers + planToResultRows (single + multi-court). 56 unit tests pass (+5), lint + build clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
matchPlay data layer: persist a generated draw as a session + per-court results, list/get sessions, and record winners. Pure plan->rows mapper is unit-tested; Supabase CRUD + TanStack hooks mirror the roster layer. Verified with 56 unit tests, lint, build.
<!-- SECTION:FINAL_SUMMARY:END -->
