---
id: TASK-81
title: Deleting a game day left its shuttle usage behind
status: Done
assignee:
  - '@claude'
created_date: '2026-08-07 12:56'
updated_date: '2026-08-07 12:56'
labels:
  - bug
dependencies: []
priority: high
ordinal: 147000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
usage_entries.session_id is ON DELETE SET NULL and deleteSession() only removed the match_sessions row, so deleting a game day that had usage recorded left the entry orphaned with no day attached: the holder stayed short, club stock stayed down, and the shuttles kept counting against the fund as usage income for a day that no longer existed.

Reported from dev: 'deleted game day that has recorded shuttles, count doesn't get reverted'.

Deleting a day is how a mistake is undone — a duplicate, a wrong date, a test. If the day did not happen, the shuttles were not used, so the usage is reversed rather than orphaned.

FIX: delete_game_day(session_id) — security definer, checks the caller is a matchmaker or admin of the club, calls restore_usage_holdings() for each of the day's usage entries (crediting the holder and writing the audit row), deletes the entries, then the session. One transaction so it cannot half-happen; deleting the session first would lose the link to what needed reversing. usage_items cascade with the entry; match_results and session_attendance cascade with the session.

Verified on dev: Ramboo 6b/3l, recorded 5 used -> 5b/10l, deleted the day -> back to 6b/3l, 1 entry removed, 1 audit row for the credit, 0 orphans, session gone.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Deleting a game day restores the shuttles it had recorded
- [x] #2 The credit appears in the inventory log
- [x] #3 No orphaned usage entry is left behind
- [x] #4 A game day with no usage still deletes cleanly
<!-- AC:END -->
