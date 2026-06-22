---
id: TASK-6.5
title: Absence decay penalty for ratings
status: Done
assignee:
  - '@claude'
created_date: '2026-06-22 19:53'
updated_date: '2026-06-22 20:19'
labels:
  - E05
  - 'size:M'
dependencies:
  - TASK-6.3
parent_task_id: TASK-6
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players must keep playing game days to retain their ranking: if a player is absent on a finished game day, apply a minus-point penalty / rating decay so inactive players drift down the boards (active play is required to hold position). Requested by product owner alongside the leaderboard.

Open design points (resolve in the task's ADR/plan): the roster 'absent' flag on player_profiles is mutable current-state, NOT historical per session — to penalize absence on a specific past game day we must RECORD ATTENDANCE per session/game day (who was present vs absent when the session was finished). Then extend the Glicko-2 recompute so each rating period also processes absentees as a penalty (e.g. a fixed minus-points decay and/or RD inflation), distinct from the engine's existing idle-RD inflation. Update ADR 0011 and the recompute-ratings Edge Function accordingly; surface decay in the leaderboard.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Attendance (present/absent) is recorded per finished game day so absence is historical, not just current roster state
- [x] #2 Absent players on a finished game day receive a rating penalty / decay during recompute (active play required to retain ranking)
- [x] #3 ADR 0011 updated to document the absence-decay rule; recompute and boards reflect it
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Decisions (from product owner): -20 rating points per missed game day; floor at 1500 (absence pulls established >1500 players back toward baseline, never below, and never penalises players already <=1500); surface as lower rating + an 'inactive' tag. Penalty applies to the INDIVIDUAL board only (pairs don't attend); keeps existing idle-RD inflation; only decays players who already have a rating.
1. Migration ..._attendance.sql: session_attendance(session_id, player_id, club_id, present, recorded_at; PK(session_id,player_id)); RLS public-read (leaderboard derives inactive set); writes service-role only. Regenerate database.types.ts.
2. Engine: RatingPeriod gains optional absentees: string[]; computeRatings applies ABSENCE_DECAY=20 floored at DEFAULT_RATING to existing-rated absentees on the player board, after the period update. Pure tests.
3. Edge Function recompute-ratings: snapshot attendance per finished session that lacks it (present = appeared in that session's results, across the CURRENT club roster) — insert-if-missing so it's historical/frozen thereafter; build absentees per period from stored attendance; pass to computeRatings.
4. App: ranking/api loadInactivePlayers (absent from latest finished game day) + E2E seed; useInactivePlayers hook; PlayerBoardList 'inactive' tag; wire into LeaderboardPage + Home preview.
5. ADR 0011: document the absence-decay rule + attendance snapshot model.
6. Validate: supabase db reset, lint + build + unit (engine + component) + e2e; finalize + commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented absence decay (active play required to retain ranking).

Schema: new migration 20260622160000_attendance.sql — session_attendance(session_id, player_id, club_id, present, recorded_at; PK(session_id,player_id)), indexes, RLS public-read, grants select to anon/authenticated, writes service-role only. Regenerated packages/supabase database.types.ts. Applied via supabase db reset (clean).

Engine (packages/domain/src/ranking): RatingPeriod gains optional absentees: string[]. ranking.ts exports ABSENCE_DECAY=20 and ABSENCE_FLOOR=DEFAULT_RATING and applies applyAbsenceDecay() to already-rated absentees on the INDIVIDUAL board only, after the period's Glicko-2 update; floors at 1500 (never decays players already <=1500, never drops below 1500). Pairs untouched; idle-RD inflation preserved. 4 new pure tests (23 ranking tests pass).

Edge Function recompute-ratings: snapshots attendance insert-if-missing per finished session (present = appeared in that session's results across current roster) so it's frozen/historical; builds absentees per period from stored attendance and passes to computeRatings.

App: ranking/api loadInactivePlayers() (absent from latest finished game day) + E2E_INACTIVE seed (e2e-7/e2e-8); useInactivePlayers hook (Set); PlayerBoardList inactive tag with title tooltip; wired into LeaderboardPage + Home preview. Component test asserts tag on absentee, absent on active player.

ADR 0011 updated: new Absence decay decision section + session_attendance consequence.

Validation: lint clean, build clean, 94 unit tests pass, 38 e2e pass (added inactive-tag assertion to leaderboard.spec.ts).

Note: deno not installed locally so Edge Function runtime not executed; verified via db reset + types + app suite; full function verification deferred to deploy (same as TASK-6.3).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Absence decay: absentees on a finished game day lose 20 rating points (floored at the 1500 baseline, individual board only) during the deterministic full-replay recompute. Attendance is snapshotted historically per session via the recompute Edge Function (new session_attendance table, public-read/service-write); the leaderboard surfaces the drop with an inactive tag on players absent from the latest game day. Engine constants are pure-tested; ADR 0011 documents the rule.
<!-- SECTION:FINAL_SUMMARY:END -->
