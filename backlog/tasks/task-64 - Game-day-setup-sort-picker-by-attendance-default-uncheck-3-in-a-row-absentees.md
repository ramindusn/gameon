---
id: TASK-64
title: >-
  Game-day setup: sort picker by attendance + default-uncheck 3-in-a-row
  absentees
status: Done
assignee: []
created_date: '2026-07-27 21:13'
updated_date: '2026-07-27 21:32'
labels:
  - feature
  - frontend
  - ranking
dependencies: []
ordinal: 117000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On the Generate Draw setup page (apps/badminton/src/routes/GeneratePage.tsx) the player picker currently lists active players in roster order and selects ALL of them by default. Change so regulars are pre-selected and frequent absentees are not: (1) sort the picker by recent attendance (players who come more often first); (2) default-UNCHECK any player who missed the last RECENT_ABSENCE_LIMIT (3) finished game days in a row, so who comes often gets selected by default. Add a small 'away' hint on default-unchecked players so the matchmaker sees why. Attendance is computed from session_attendance over the last ATTENDANCE_WINDOW (5) finished game days (any kind, matching the inactive/decay logic). The matchmaker can still tick/untick anyone. When there are too few game days (or no attendance data / E2E), behaviour is unchanged (roster order, all selected).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 New loadPlayerAttendance() + pure computeAttendance() return, per player, a recent-attended count and a consecutive miss-streak (counting back from the most recent rostered game day, skipping sessions before they joined)
- [x] #2 Setup picker is sorted by attendance: default-unchecked absentees sink to the bottom, otherwise most-attended first, then nickname
- [x] #3 Players who missed the last 3 finished game days in a row start UNCHECKED; everyone else starts checked
- [x] #4 Default-unchecked players show a small muted 'away' hint with a title explaining the miss streak
- [x] #5 With no attendance data / fewer than 3 game days / E2E, the picker keeps roster order and selects everyone (existing behaviour, generate e2e 'Selected: 8/8' still passes)
- [x] #6 Unit tests cover computeAttendance: attended count, streak stops at a present game day, streak counts leading misses, sessions before a player joined are skipped
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added computeAttendance() (pure) + loadPlayerAttendance() + usePlayerAttendance() over the last ATTENDANCE_WINDOW (5) finished sessions of any kind; constants ATTENDANCE_WINDOW=5, RECENT_ABSENCE_LIMIT=3 in ranking/api.ts. GeneratePage now sorts the picker (away absentees last, then most-attended, then nickname), default-selects only players with missStreak < 3, and shows a muted 'away' badge (with a title naming the streak) on the unchecked absentees. E2E/empty-attendance path keeps roster order + all selected. Verified: 5 new computeAttendance unit tests + a GeneratePage component test feeding attendance data (asserts 6/8 selected, p6/p7 unchecked + away badge + sorted last); full unit suite (bar the pre-existing PlayerProfilePage timezone failure), comprehensive typecheck, lint, 40/40 e2e, and build all pass. /generate is matchmaker-auth-gated so not screenshot-verified against the live dev DB, but a dev SQL check of the last 5 game days confirms the intended unchecked set (e.g. Kimmo ---P streak 3, Bevin/Kavini/Nishadi/Samath/Tharindu/Wudith streak 5, Nilusha streak 4).

UI refinement: the per-cell 'away' badge was cutting player names in the narrow 2-col mobile grid. Replaced it with a grouped layout — regulars in the top grid, then a labelled 'Away · missed the last 3+ game days — unchecked by default' sub-group below (muted cells). No element competes with the name for width at any breakpoint, and the heading explains the unchecked state on mobile where tooltips don't work. Extracted a shared renderCell helper; component test still green (7/7).

Per user: dropped the 'away' heading/group and all away-specific styling — the picker is one uniform grid sorted by attendance, and frequent absentees simply start unchecked (no badge, label, or muted tone). Sort + default-uncheck logic unchanged. Component test updated (removed away-badge assertions); 7/7 pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Game-day setup picker now sorts by recent attendance and pre-selects only regulars — anyone who missed the last 3 finished game days in a row starts unchecked (with an 'away' hint) and sorts to the bottom, so frequent attendees are selected by default. New computeAttendance/loadPlayerAttendance data layer + usePlayerAttendance hook. Covered by unit + component tests; e2e and build green.
<!-- SECTION:FINAL_SUMMARY:END -->
