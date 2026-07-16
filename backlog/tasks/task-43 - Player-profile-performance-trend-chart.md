---
id: TASK-43
title: Player profile performance trend chart
status: Done
assignee: []
created_date: '2026-07-16 20:49'
updated_date: '2026-07-16 20:49'
labels:
  - feature
  - ui
dependencies: []
ordinal: 97000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a performance chart to the public player profile: a single-series area+line of the player's cumulative point difference (points won - lost) across matches, oldest to newest, with a zero baseline, end marker, date labels, and a hover crosshair+tooltip. Dependency-free inline SVG, theme-consistent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Player profile shows a 'Performance trend' chart of cumulative point difference over matches
- [x] #2 Chart has a hover tooltip and hides when fewer than 2 matches
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added PerformanceChart to the player profile: cumulative point-difference area+line (single accent series, zero baseline, end marker, date labels, hover crosshair+tooltip), inline SVG (no chart lib). Shown when >=2 matches. Verified on localhost with prod-cloned data.
<!-- SECTION:FINAL_SUMMARY:END -->
