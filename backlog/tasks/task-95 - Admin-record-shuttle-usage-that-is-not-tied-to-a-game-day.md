---
id: TASK-95
title: 'Admin: record shuttle usage that is not tied to a game day'
status: Done
assignee: []
created_date: '2026-08-27 08:28'
updated_date: '2026-08-27 08:35'
labels: []
dependencies: []
priority: high
ordinal: 161000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shuttles get used on evenings that have no game day row - most obviously when a game day is deleted after the fact, which is exactly what happened on 2026-08-26: the day was played, shuttles were used, then the day was deleted and there was no longer anything to record the usage against.

record_game_day_usage() derives the club from the game day itself (select club_id from match_sessions where id = p_session_id; raise 'No such game day' if null), so a session-less entry is impossible today even though usage_entries.session_id is already nullable. The admin card also hides its form entirely once every game day is answered, so when there is no pending day there is no way in at all.

Add an admin-only path to record usage with a date, a short note, and the usual per-brand/per-holder lines, writing a usage_entries row with session_id null.

The money side needs no work: fund/api.ts reads usage_entries and usage_items with select('*'), so a session-less entry is costed and counted automatically. Only loadUsageBySession filters on session, which is correct - a standalone entry simply does not appear in the game-day history.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An admin can record shuttle usage with no game day: a date they choose, a short note, and the same per-brand/per-holder lines as game-day usage
- [x] #2 The entry writes usage_entries with session_id null and the note stored, and deducts from the chosen holder exactly as game-day usage does
- [x] #3 The admin usage card is reachable even when every game day has been answered, which is when this is most needed
- [x] #4 Only an admin can record a standalone entry; the existing matchmaker game-day flow is unchanged
- [x] #5 The note is stored on usage_entries and shown wherever the entry is listed
- [x] #6 Backdating works, so yesterday's shuttles can be recorded today
- [x] #7 The shuttle deduction is audited in inventory_log, distinguishable from game-day usage
- [x] #8 Tests cover recording a standalone entry, the admin-only guard, and the existing game-day flow still working
- [x] #9 typecheck, lint and unit tests pass
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The only thing genuinely blocking this was where the club comes from: record_game_day_usage() read it off the game day. Rather than copy the ~60 lines that check the holding, deduct it and write the audit row, that body moved into record_usage_lines(), which both entry points now share. record_usage_lines takes the club as an argument and does NO authorisation of its own - it is revoked from public, anon and authenticated, and only reachable through the two security-definer wrappers.

record_game_day_usage keeps its exact signature and behaviour, so the existing matchmaker flow and the deployed frontend are untouched. That also makes the migration backward-compatible: it can go to prod before the frontend that uses the new function.

Standalone entries are admin-only (is_admin, not is_matchmaker). A matchmaker records against the day they just played; an entry attached to nothing is a correction. An empty standalone entry is refused - the 'none were used' marker exists to close off a game day, and a standalone entry has no day to close, so the UsageForm hides that button via allowNone.

UsageForm was generalised rather than duplicated: it now takes a record() callback instead of a sessionId, so the holder/count UI is shared by both flows.

note threads domain-side too (UsageEntry -> UsageDay -> TodayUsage), so a standalone entry is identifiable in the dashboard usage history rather than being an anonymous date.

Validation:
- Migration 20260827020000 applied to dev.
- supabase/tests/standalone_usage.sql, six branches against dev, self-rolling-back: standalone entry written with session_id null and the note kept; the shuttle actually came off the holder (12 -> 11); the audit row reads '1 shuttles used (no game day: ...)'; an empty entry is refused; game-day usage still works with note null; a non-admin matchmaker is refused. All PASS.
- npm test 450 pass (4 new), lint clean, typecheck clean.
- Caught late by typecheck, not by the tests: the vi.fn mock had no declared parameters, so reading mock.calls[0][0] did not typecheck even though the test passed. Worth remembering that vitest passing is not evidence the test file typechecks.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
An admin can now record shuttle usage with no game day behind it: a date, a short note, and the usual per-brand/per-holder lines, folded away behind 'Record usage with no game day' in the admin usage card - and reachable even when every game day has been answered, which is exactly when it is needed.

record_game_day_usage() derived the club from the game day, so this was impossible before even though usage_entries.session_id was already nullable. Migration 20260827020000 moves the shared work into record_usage_lines() (not client-callable) and adds record_standalone_usage(), which is admin-only, refuses an empty entry, and writes session_id null with a note. usage_entries gains a nullable note column, surfaced in the dashboard usage history.

The existing matchmaker game-day flow is byte-for-byte unchanged, and the migration is backward-compatible with the currently deployed frontend.

Verified against dev with supabase/tests/standalone_usage.sql (six branches, all PASS) plus 450 unit tests, clean lint and typecheck.
<!-- SECTION:FINAL_SUMMARY:END -->
