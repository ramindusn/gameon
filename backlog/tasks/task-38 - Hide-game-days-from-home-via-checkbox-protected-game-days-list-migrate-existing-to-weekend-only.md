---
id: TASK-38
title: >-
  Hide game days from home via checkbox + protected /game-days list; migrate
  existing to weekend-only
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-07-11 17:31'
updated_date: '2026-07-11 18:07'
labels:
  - feature
  - ranking
  - dashboard
dependencies: []
ordinal: 92000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a 'hidden' flag to game days. Public home Game Day Podium shows only non-hidden game days (paged by arrows). A 'Don't show on home page' checkbox sits next to the Finish game day button on the play/scores page; ticking it hides that game day from home. A data migration hides all existing game days except weekend ones (all envs). A new protected /game-days page (admin + matchmaker) lists every game day and links to the /game-days/:id scores page.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 match_sessions has a 'hidden' boolean (default false); home Game Day Podium filters hidden=false
- [x] #2 Checkbox next to Finish game day button toggles/persists the game day's hidden flag
- [x] #3 Migration sets hidden=true for existing non-weekend game days in all environments
- [x] #4 New protected /game-days page (admin + matchmaker) lists all game days, each linking to /game-days/:id
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented: match_sessions.hidden column + migration 20260711180000 (backfill hides non-weekend existing rows, DOW not in (0,6)); loadGameDayBoards filters hidden=false; setSessionHidden + useSetSessionHidden; 'Don't show on home page' checkbox next to Finish on PlayPage; new protected /game-days page (AllGameDaysPage, admin+matchmaker) + nav links → links to /game-days/:id; database.types.ts updated with hidden. Applied migration to DEV via supabase db push (verified: Sat casual stays visible, Thu casual + Tue tournaments hidden). Verified full flow at runtime (E2E build: checkbox next to Finish, /game-days list, home podium intact) and real dev home loads clean. 197 tests + lint + tsc green. PROD migration NOT yet applied (awaiting review).

Applied migration to PROD via supabase CLI (MCP was read-only): backfill verified — 5 Jul & 28 Jun Sundays visible, 8 Jul Wed casual + 23 Jun Tue tournaments hidden. Merged PR #16 → main; Deploy workflow shipped frontend to badmintonduo-prod. Prod verified live: home Game Day Podium now shows 5 Jul (Sun) with pager to 28 Jun; no console errors. CLI relinked to dev.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Game days now carry a 'hidden' flag. The public home Game Day Podium shows only non-hidden casual game days; a 'Don't show on home page' checkbox next to Finish game day toggles it. Migration 20260711180000 adds the column and backfills existing data to weekend-only (applied to dev + prod). A new protected /game-days page (admin + matchmaker) lists every game day and links to the /game-days/:id scores page. Also renamed the widget to 'Game Day Podium' with a cohesive pager pill. Verified with 197 tests, Playwright end-to-end, and live in prod.
<!-- SECTION:FINAL_SUMMARY:END -->
