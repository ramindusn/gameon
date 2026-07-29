---
id: TASK-66
title: 'Rework ''Improving'' badge to track rating trajectory, not win/loss form'
status: Done
assignee: []
created_date: '2026-07-29 01:42'
updated_date: '2026-07-29 01:42'
labels:
  - feature
  - ranking
  - profile
dependencies: []
ordinal: 119000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The profile 'Improving' badge was based on recent win/loss form (won more recent game-days than lost), which is not the same as improving — a player who gains rating by beating stronger opponents while still losing more matches (e.g. Nilmini) wouldn't get it, and a steady winner who isn't improving would. Rebase it on the rating trajectory: improving when the current rating is above where it was ~5 game days ago (needs >=3 game days of history), using the rating-after-each-day series already loaded on the profile. Show the gain in the tooltip. Aligns the badge with the #rank movement chip and what 'improving' actually means.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 'Improving' is true iff the rounded rating is higher than ~5 game days ago, with at least 3 game days of rating history
- [ ] #2 Badge tooltip shows the rating gain over the window ('Rating up +N over recent game days')
- [ ] #3 Logic extracted to a pure, unit-tested computeImproving(points) helper (window, min-games, rounding, recovery cases covered)
- [ ] #4 Verified on real profiles: badge aligns with rank movement (climbers show it, decliners don't)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reworked the profile 'Improving' badge from a win/loss-form heuristic to a rating-trajectory signal: improving when the current rating is above ~5 game days ago (min 3 game days), with the gain in the tooltip. Pure computeImproving() helper + 6 unit tests. Verified on real profiles — it now aligns with rank movement (Sahan +75 ▲3 shows it; Ramboo ▼1 doesn't).
<!-- SECTION:FINAL_SUMMARY:END -->
