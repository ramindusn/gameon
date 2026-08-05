---
id: TASK-71
title: 'Merge the read-only /game-days/:id page into /play/:id — one game-day page'
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-08-05 04:00'
updated_date: '2026-08-05 04:07'
labels:
  - refactor
  - play
  - ui
dependencies: []
priority: medium
ordinal: 132000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
There are two pages for the same game day and they largely duplicate each other. /game-days/:id (GameDayPage, TASK-37, 279 lines) is the public read-only view: standings by net point differential plus the match score history (rounds → courts). /play/:id (PlayPage, TASK-50, 1570 lines) is already public and read-only for non-matchmakers, and its two tabs cover the same ground — Matches (court cards with scores) and Points (point diff + per-day ranking deltas) — with matchmaker editing on top. Collapse them into a single page so there is one URL per game day.

Inbound links to update: Home game-day-rank widget (Home.tsx ~321), PlayerProfilePage match history (~257), AllGameDaysPage (~49), and PlayPage's own 'Full results' share link (PlayPage.tsx ~215) which currently points at /game-days/:id. Keep /game-days/:id working as a redirect so shared links and any bookmarks survive.

Decide which URL wins (/game-days/:id reads better for a shared public link; /play/:id is what the matchmaker flow uses) and make sure the merged page still degrades to read-only for signed-out visitors.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 One page serves both the public read-only view and the matchmaker view of a game day
- [x] #2 The old URL redirects to the surviving one so shared links and bookmarks keep working
- [x] #3 Home, player profile, All game days, and the share link all point at the surviving URL
- [x] #4 Signed-out visitors still get a read-only page with no editing controls
- [x] #5 Standings/points and the match history are not duplicated in the merged page
- [x] #6 GameDayPage is removed (or reduced to the redirect) with its tests folded in; verify green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
PlayPage now serves /game-days/:id (it already did both public read-only and matchmaker editing via the Matches/Points tabs); /play/:id is a PlayRedirect that Navigates to /game-days/:id with replace, so shared links, bookmarks and open tabs still land. Repointed Home 'Live now', GeneratePage's two post-create navigations, and MatchmakerHome's resume/recent links; PlayPage's 'Full results' share link already pointed at /game-days/:id and is now the same page. Deleted GameDayPage.tsx + its test — the Points tab already had the same standings table (rank, player link, Won–Lost, Points, Ranking) and the Matches tab the same scores. One behaviour was NOT duplicated and has been folded in: GameDayPage read actual recorded per-day rating deltas (useGameDayRatingDeltas) while PlayPage showed a local projection, so standings now prefer the real delta when present (finished + recomputed days) and fall back to the projection while live. Updated Home/MatchmakerHome/PlayPage/App tests and e2e play.spec URLs; added tests for the redirect and for real-deltas-win. Verified: lint, typecheck, 348 unit, 40 e2e.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Collapsed the duplicate game-day pages into one. /game-days/:id is now served by PlayPage (public read-only for players, editing for matchmakers); /play/:id redirects to it so existing links keep working. All inbound links repointed, GameDayPage removed, and its one unique behaviour — actual recorded rating deltas — folded into the Points tab, which now prefers the real delta on finished days and keeps the projection while live. Verified: lint, typecheck, 348 unit, 40 e2e.
<!-- SECTION:FINAL_SUMMARY:END -->
