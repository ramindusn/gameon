---
id: TASK-60
title: 'Metric colour consistency: blue = game-day points, green = ranking, everywhere'
status: Done
assignee: []
created_date: '2026-07-27 20:17'
updated_date: '2026-07-27 20:22'
labels:
  - ui
  - ranking
  - polish
dependencies: []
ordinal: 113000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users should identify a number at a glance by its colour: blue (text-sky-400 / POINTS_TEXT) = rally/game-day points from a single game day; green (text-accent-strong / RANK_TEXT) = points toward the leaderboard rating. metricColors.ts already defines these and GameDayPage/PlayPage/PerformanceChart apply them correctly, but several surfaces are inconsistent: (a) Home Game Day Podium coloured its net point diff GREEN via a local diffColor() — should be blue; (b) Home ranking preview table rating was neutral white — should be green; (c) the FLAGSHIP main Leaderboard rating value (ranking/Leaderboard.tsx Rating component, both player + pair boards) is neutral white — should be green; (d) the player profile 'Rating' stat is neutral white — should be green; (e) GameDayPage RatingDelta uses a raw text-accent-strong literal instead of the shared RANK_TEXT constant. Generic brand-accent green (nav, links, 'View', badges, podium #1 highlight, win indicators, W/L/D form pills, rank-movement arrows) must be LEFT ALONE — only actual points/ranking numeric values get the metric colours.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Home Game Day Podium + overflow-row net point diffs render blue (POINTS_TEXT), matching /game-days/:id
- [x] #2 Home Individual + Doubles ranking preview 'Rating' header + values render green (RANK_TEXT)
- [x] #3 Main Leaderboard (ranking/Leaderboard.tsx) rating value renders green on both the individual and doubles boards
- [x] #4 Player profile 'Rating' stat value renders green; the other stats (Skill, Record, Games, Recent form) are unchanged/neutral
- [x] #5 GameDayPage RatingDelta positive value uses the shared RANK_TEXT constant (not a raw literal)
- [x] #6 Generic brand-accent green (links, nav, buttons, badges, podium #1 highlight, win/loss indicators, W/L/D pills, rank-move arrows) is unchanged — only points/ranking numeric metrics were recoloured
- [x] #7 Existing tests pass; typecheck + lint clean
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Applied the metricColors language (POINTS_TEXT blue / RANK_TEXT green) to every previously-inconsistent numeric metric surface: Home.tsx (podium + overflow-row point diffs -> POINTS_TEXT, removed the local diffColor() helper; ranking preview table Rating header+values -> RANK_TEXT); ranking/Leaderboard.tsx Rating component -> RANK_TEXT (both individual + doubles boards); PlayerProfilePage.tsx added an optional valueTone to the Stat component and passed RANK_TEXT only for the Rating stat (Skill/Record/Games stay neutral); GameDayPage.tsx RatingDelta positive branch now uses the shared RANK_TEXT constant instead of a raw text-accent-strong literal. Left untouched (correctly): PerformanceChart.tsx (already the reference impl), all generic brand-accent green (nav/links/View/badges/podium #1 highlight/pager buttons), win/loss indicators, W/L/D form pills, rank-movement arrows, and raw match scores. Verified visually on localhost (dev DB) across Home, /leaderboard, a player profile, and a game-day page — blue reads as game-day points and green as ranking everywhere, with both metrics side-by-side on the game-day + PointsTab tables. Consolidated the two earlier interim branches (fix/home-points-color, fix/home-ranking-color) into this single branch. Full suite passes except the pre-existing unrelated PlayerProfilePage timezone test failure (also fails on main); app typecheck + lint clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Made the two point metrics readable at a glance everywhere: game-day/rally points are always blue (POINTS_TEXT), leaderboard ranking/rating is always green (RANK_TEXT). Fixed the Home podium (was green), Home ranking preview, the main Leaderboard rating, and the profile Rating stat (all were neutral/wrong), and routed GameDayPage's rating-gain through the shared constant. Generic brand-accent green and win/form indicators were deliberately left alone. Verified across Home, Leaderboard, Profile, and Game Day on localhost.
<!-- SECTION:FINAL_SUMMARY:END -->
