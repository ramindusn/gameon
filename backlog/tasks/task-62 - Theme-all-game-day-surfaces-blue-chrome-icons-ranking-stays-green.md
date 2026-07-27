---
id: TASK-62
title: Theme all game-day surfaces blue (chrome + icons); ranking stays green
status: Done
assignee: []
created_date: '2026-07-27 20:37'
updated_date: '2026-07-27 20:50'
labels:
  - ui
  - ranking
  - polish
dependencies: []
ordinal: 115000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extends TASK-60/61. Every game-day-identity accent across the app goes blue (sky): section headers + their icons, card frames, card icons, page eyebrow labels, #1 rank/podium highlights, status/live pills, pagers, round-progress dots — on Home (Live now + Game Day Podium), the GameDayPage detail, the AllGameDaysPage list, and the live PlayPage. KEEP GREEN (deliberately): the ranking metric (rating values + rating-gain columns) which is green even on game-day pages by design; the Leaderboard + Home ranking-preview cards; the shared 'BadmintonDuo' brand wordmark in page nav headers (app-wide identity, same on green pages); form/interaction chrome (input focus rings, checkboxes, primary buttons); and win/loss indicators (winner-name highlight, favoured-to-win meter, W/L pills). Centralise blue values as reusable constants in metricColors.ts; add an optional iconTone to the shared Card so only game-day cards get a blue icon.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Home 'Live now' card is fully blue (frame, Live pill+dot, View link, section icon)
- [x] #2 Home 'Game Day Podium' section icon + date pager arrows are blue (card already blue)
- [x] #3 GameDayPage: 'Game Day' eyebrow, both section-card icons, and the #1 rank badge are blue; Points col blue, Ranking col stays green
- [x] #4 AllGameDaysPage: game-day row hover + the Live status pill + row chevron/icon are blue
- [x] #5 PlayPage (live game day): header icon, live pill, active tab, #1 podium badge, pager, round-progress dots are blue; ranking column, form focus rings, win meters, winner highlights stay their current colour
- [x] #6 Shared Card gains an optional iconTone; ranking/fund/leaderboard cards keep the green default icon
- [x] #7 Leaderboard page + Home ranking preview remain green; typecheck + lint + tests pass
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added POINTS_PILL (bg-sky-400/15 text-sky-400) + POINTS_DOT (bg-sky-400) to metricColors.ts; added optional iconTone to the shared Card (default text-accent). Blue applied: Home Section icon (both uses are game-day) + Live now card frame/pill/dot/View + Game Day Podium pager arrows; GameDayPage 'Game Day' eyebrow + both card icons (iconTone) + #1 rank badge; AllGameDaysPage card icon + row hover + Live pill; PlayPage header shuttle/tournament icon + Live status pill + active tab + #1 points badge + round pager arrows + round-progress done-dots. Kept GREEN deliberately (reported to user): the ranking metric (rating values + RatingDelta column) — green even on game-day pages by design; Leaderboard + Home ranking-preview cards; the shared 'BadmintonDuo' brand wordmark in every page header (app-wide identity); form/interaction chrome (input focus rings, checkboxes); and win/success semantics (winner-name highlight, 'UPSET' tag, scored ✓ checkmarks, favoured-to-win meter) + the Share action button. Verified visually on localhost (Home, GameDayPage, PlayPage) — no console errors. App typecheck + lint clean; full suite passes bar the pre-existing PlayerProfilePage timezone failure.

Follow-up: per user request, the winner-name highlight on game-day surfaces (GameDayPage match scores + PlayPage match cards) is now blue (POINTS_TEXT) instead of green — removes the green-on-green overlap with the ranking metric. Losing teams stay neutral. Verified on localhost.

Follow-up 2: converted the remaining greens ON the PlayPage match card to blue per user — scored ✓ checkmark, win-predictor bar (favoured fill + even-state), favoured win-% text, 'Edit line-up' action link, and the UPSET tag now use game-day blue. Kept green (off the card / interaction): Share button (header action), score-input focus rings (universal form interaction), player-link hover in the standings table, brand wordmark, and the Ranking metric legend/column. Verified on localhost.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Themed all game-day surfaces blue (chrome + icons) across Home (Live now + Game Day Podium), the GameDayPage detail, AllGameDaysPage, and the live PlayPage — section/card icons, frames, eyebrow labels, #1 rank badges, live/status pills, pagers, and round-progress dots. Centralised via metricColors constants + an optional Card iconTone. Ranking metric, leaderboard/ranking cards, brand wordmark, form chrome, and win/success indicators intentionally stay green. Verified on localhost.
<!-- SECTION:FINAL_SUMMARY:END -->
