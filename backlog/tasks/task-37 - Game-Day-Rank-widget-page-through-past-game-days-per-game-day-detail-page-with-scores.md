---
id: TASK-37
title: >-
  Game Day Rank widget: page through past game days + per-game-day detail page
  with scores
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-07-11 16:45'
updated_date: '2026-07-11 16:51'
labels:
  - feature
  - ranking
  - dashboard
dependencies: []
ordinal: 91000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evolve the public-home game-day board (TASK-33) into a browsable 'Game Day Rank' widget. Rename the card from 'Points differential' to 'Game Day Rank'. Latest game day shows first; a right arrow loads the previous (older) game day's rank table, a left arrow returns toward the latest. Clicking the widget opens a separate public page (/game-days/:id) showing that game day's rank table on top, then the full match score history for that day (rounds/courts with scores and winners).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Home widget titled 'Game Day Rank' shows the latest game day's rank table first
- [x] #2 Right/left arrows page through past game days (right = older, left = newer), disabled at the ends
- [x] #3 Clicking the widget opens /game-days/:id for the shown game day
- [x] #4 Detail page shows the game day's rank table on top, then match score history (per round/court, with scores and winner) below
- [x] #5 Detail page is public (no login) and handles loading / not-found states
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Data: replace loadLatestGameDayBoard with loadGameDayBoards() → all scored casual game days as GameDayBoard[], newest first. Update E2E seed to 2 boards. Rename hook useGameDayBoard→useGameDayBoards.
2. Home: replace LatestGameDay with GameDayRank widget — title 'Game Day Rank', prev/next arrows (right=older, left=newer) + date in the Section action, clickable card body → /game-days/:id, plain names.
3. Detail page routes/GameDayPage.tsx (public /game-days/:id): useSession(id); rank table (names link to profiles) on top, then match score history grouped by round/court with scores + winner. Loading/not-found states.
4. Router: add public route in App.tsx.
5. Tests: update Home.test (Game Day Rank + arrow paging); add GameDayPage.test.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented: loadGameDayBoards() (all scored casual game days newest-first) + useGameDayBoards hook; Home 'Game Day Rank' widget with ‹/› paging (right=older) + clickable card → /game-days/:id; new public GameDayPage (rank table + per-round match scores) reusing useSession. Renamed card 'Points differential' → 'Game Day Rank'. Tests: Home arrow-paging + link, GameDayPage standings/scores + not-found. Verified live (Playwright): rename, date header, click-through, detail page render all correct against real data; multi-day arrow paging covered by unit tests (dev DB has one game day).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Turned the public-home game-day board into a browsable 'Game Day Rank' widget: latest day first, ‹/› arrows page back to older days (and forward), and the card links to a new public /game-days/:id page showing that day's rank table on top and the full per-round match score history below. Data via new loadGameDayBoards(); detail page reuses useSession. Verified with component tests + a live Playwright drive.
<!-- SECTION:FINAL_SUMMARY:END -->
