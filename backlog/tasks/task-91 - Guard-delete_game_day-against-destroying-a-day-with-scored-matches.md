---
id: TASK-91
title: Guard delete_game_day against destroying a day with scored matches
status: Done
assignee: []
created_date: '2026-08-26 23:01'
updated_date: '2026-08-27 06:03'
labels: []
dependencies: []
priority: high
ordinal: 157000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On 2026-08-26 a live tournament was deleted in prod by accident. delete_game_day hard-deleted match_session c3a0c1bb-3b98-411a-abb5-4b392219e114 along with 18 match_results (13 already scored), 3 tournament_teams and its session_attendance, via ON DELETE CASCADE. With no PITR and no backups on the Free plan, the data was unrecoverable from the database. See RECOVERY-2026-08-26.md for the full incident trace.

The RPC currently takes only p_session_id, checks that the caller is an admin or matchmaker, and deletes unconditionally. There is no confirmation that survives a mis-tap and no way back. Note that deleting a game day with NO scores is a legitimate flow - it is used to restart a botched draw, and happened correctly earlier the same evening - so a blanket block is wrong.

Goal: make it impossible to destroy a day that has real results without a deliberate, explicit second step.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 delete_game_day raises a distinct, catchable error when the session has any match_results with a non-null winner or score, unless an explicit force flag is passed
- [x] #2 A deliberate delete is still possible: the caller can pass an explicit confirmation argument (e.g. p_force) to proceed
- [x] #3 Deleting a game day with zero scored matches still succeeds unchanged, with no extra confirmation
- [x] #4 The UI surfaces the refusal with a message naming how many scored matches would be lost, and requires a separate deliberate action to force the delete
- [x] #5 The error is distinguishable from the existing insufficient_privilege error so the client can tell the two apart
- [x] #6 Migration added under supabase/migrations and applied to dev before merge
- [x] #7 Tests cover: refuse-with-scores, force-with-scores, and plain-delete-without-scores
- [x] #8 delete_game_day archives the full day (match_sessions row, match_results, tournament_teams, session_attendance) before deleting, in the same transaction
- [x] #9 restore_game_day(p_session_id) re-inserts an archived day and its children in FK order, and refuses if a live session with that id already exists
- [x] #10 The archive table is RLS-protected: only an admin or matchmaker of the owning club can read or restore it
- [x] #11 No changes are needed to the ~14 existing match_sessions queries - archived days are absent from the live tables, so they cannot leak into leaderboards or rating recomputes
- [x] #12 The shuttle-usage reversal behaviour from TASK-81 is preserved
- [x] #13 Tests cover a delete then restore round trip that returns identical rows
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Migration: create deleted_game_days archive table (session_id pk, club_id, deleted_at, deleted_by, scored_matches, payload jsonb holding the session row + match_results + tournament_teams + session_attendance). RLS: select/insert restricted to is_admin(club) or is_matchmaker(club).
2. Migration: replace delete_game_day(uuid) with delete_game_day(p_session_id uuid, p_force boolean default false). Order inside the one transaction: resolve club and authorise (unchanged) -> count scored matches (winner not null or score_a/score_b not null) -> if scored and not p_force, raise with a distinct errcode so the client can tell it from insufficient_privilege -> snapshot the day into deleted_game_days -> reverse shuttle usage (unchanged TASK-81 behaviour) -> delete the session, cascading as today. Keep a delete_game_day(uuid) overload so the existing client call and generated types keep working.
3. Migration: restore_game_day(p_session_id uuid) - reads the archive, refuses if a live session with that id exists, re-inserts session then match_results, tournament_teams, session_attendance in FK order, and clears the archive row. Same admin/matchmaker authorisation.
4. Client: play/api.ts deleteSession gains a force argument and surfaces the guard error as a typed result rather than a raw throw; add restoreSession(). Regenerate database.types.ts.
5. UI: PlayPage confirm step names how many scored matches would be lost and requires a second deliberate action to force. Unscored days keep today's single confirm.
6. Tests: pgTAP or SQL-level tests for refuse-with-scores, force-with-scores, plain delete of an unscored day, and a delete-then-restore round trip asserting identical rows; update PlayPage tests for the new confirm copy.
7. Apply to dev and verify before merge. Do NOT touch prod match_results while the support ticket is open - dead tuples must stay under the autovacuum threshold.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented as archive + restore + guard, widened from the original guard-only scope at the user's request (the goal was a way to restore, not only to prevent).

Design decision - archive table over a deleted_at column: match_sessions is read from ~14 sites across play/api.ts and ranking/api.ts. A soft-delete flag would need filtering at every one, and a missed filter puts a deleted day back into a leaderboard or a rating recompute. Moving rows out of the live tables keeps every existing query correct without touching any of them.

Known limitation, deliberate: restore_game_day does NOT replay shuttle usage. delete_game_day credits those shuttles back to the holder (TASK-81) and writes the audit row; re-debiting on restore would fight whatever the stock has done since. The usage rows are kept in the archive payload for the record only. A restored day therefore needs its usage re-logged by hand.

No UI yet for browsing/restoring archived days - restore_game_day is callable from the SQL editor or via restoreSession() in play/api.ts, but nothing surfaces the archive. Worth a follow-up task.

Validation:
- Migration 20260827010000 applied to dev via supabase db push.
- supabase/tests/archive_restore_game_day.sql exercises all six branches against dev and rolls itself back: refuse-without-force (and does not archive), forced delete archives with correct counts, restore returns byte-identical rows and consumes the archive, restore over a live session refuses without consuming the archive, unknown id is a clean PT404, unscored day deletes without force and is still archived. All PASS.
- npm test: 44 files, 440 tests pass (8 new in play/deleteGameDay.test.ts, 2 new in PlayPage.test.tsx).
- npm run lint: clean.
- npm run typecheck: the only errors are pre-existing, in ranking/api.ts and Home.test.tsx from uncommitted in-progress work widening GameDayBoard with kind/pairStandings. Not touched.
- Prettier: the four files edited were already unformatted at HEAD, so they were left as-is rather than reformatted into unrelated churn. The new test file is formatted.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
delete_game_day now archives a whole game day before removing it, and refuses outright to delete one with scored matches unless the caller forces it; restore_game_day puts an archived day back.

Migration 20260827010000 adds deleted_game_days (RLS: read limited to the club's admins/matchmakers), replaces delete_game_day with a (p_session_id, p_force) version that snapshots session + match_results + tournament_teams + session_attendance into a jsonb payload in the same transaction, and adds restore_game_day which re-inserts them in FK order and refuses to overwrite a live session. The refusal raises PT409, so PostgREST returns 409 and the client can tell it from the 403 an insufficient_privilege raise produces; the scored-match count travels in the error detail.

Client: deleteSession takes a force flag and converts PT409 into a typed ScoredGameDayError carrying the count; useDeleteSession stays silent on that error instead of firing a generic failure toast; PlayPage replaces the generic 'Confirm delete' with a prompt naming how many scored matches would be lost plus a separate 'Delete anyway'. Deleting an unscored day is unchanged - one confirm - because that is the legitimate restart flow.

Verified against dev with supabase/tests/archive_restore_game_day.sql (six branches, all PASS, self-rolling-back) plus 440 unit tests and a clean lint.
<!-- SECTION:FINAL_SUMMARY:END -->
