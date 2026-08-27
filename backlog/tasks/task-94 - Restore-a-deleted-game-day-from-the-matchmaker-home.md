---
id: TASK-94
title: Restore a deleted game day from the matchmaker home
status: Done
assignee: []
created_date: '2026-08-27 08:02'
updated_date: '2026-08-27 08:06'
labels: []
dependencies: []
priority: high
ordinal: 160000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-91 made every deleted game day recoverable by archiving it into deleted_game_days, but restoring one means running restore_game_day('<id>') in the Supabase SQL editor. The owner has deliberately declined backups of any kind (see TASK-92), so this archive is the entire safety net for an accidental delete - and right now it is only reachable by someone with SQL access, which is no use to a matchmaker at the hall on their phone.

Surface the archive in the matchmaker area: what can be restored, and a button that restores it.

The RLS on deleted_game_days already limits reads to the club's admins and matchmakers, and restore_game_day already authorises the same way and refuses to collide with a live session, so this is a UI and data-layer task only - no migration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The matchmaker home lists archived game days, newest deletion first, each showing the game day's date, whether it was a tournament, and how many matches (and how many scored) would come back
- [x] #2 Each row has a Restore button that calls restore_game_day and, on success, the day reappears in the game day history
- [x] #3 The card is hidden entirely when nothing is archived, so it does not clutter the normal case
- [x] #4 Restoring shows who deleted the day and when, so it is clear what is being undone
- [x] #5 A failed restore surfaces an error rather than failing silently
- [x] #6 Tests cover the list rendering, a successful restore, and the empty case hiding the card
- [x] #7 typecheck, lint and unit tests pass
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
UI + data layer only, no migration - TASK-91 already shipped deleted_game_days (RLS: read limited to the club's admins/matchmakers) and restore_game_day (same authorisation, refuses to collide with a live session), and both are already applied to prod.

listDeletedGameDays() resolves deleted_by to a nickname with the same lookup pattern as withCreatorNames(). Returns [] under E2E, since the e2e store has no archive - that keeps the card hidden there rather than breaking the specs against a table that does not exist.

The card renders nothing when the archive is empty, which is nearly always. It appears only when there is something to undo, so it costs nothing on a normal visit.

No confirm step on Restore, deliberately: restoring is the undo, it is not destructive, and restore_game_day refuses rather than merging if a live day already holds that id. Adding a confirm would just be friction on the recovery path.

Known gaps, both acceptable for now: archived days are never purged (they are tiny, and purging is what caused this whole incident), and there is no restore route for anything other than a game day.

Validation: 446 unit tests pass (4 new in MatchmakerHome.test.tsx), lint clean, typecheck clean. The database half was already verified against dev by supabase/tests/archive_restore_game_day.sql under TASK-91.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Adds a 'Recently deleted' card to the matchmaker home listing archived game days, newest deletion first, each with the day's date, a tournament tag where relevant, how many matches (and how many were scored) would come back, when it was deleted and by whom - plus a Restore button.

Closes the loop on TASK-91: a deleted game day was already recoverable, but only by running restore_game_day() in the SQL editor. With backups deliberately declined (TASK-92), that archive is the only safety net, so it had to be reachable from a phone.

The card hides itself when nothing is archived. Restoring returns matches, pairs and attendance; shuttle usage is not replayed, and the card says so.

Verified with 446 unit tests (4 new), clean lint and typecheck.
<!-- SECTION:FINAL_SUMMARY:END -->
