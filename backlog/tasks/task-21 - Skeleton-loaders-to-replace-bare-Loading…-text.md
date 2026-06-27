---
id: TASK-21
title: Skeleton loaders to replace bare 'Loading…' text
status: Done
assignee: []
created_date: '2026-06-27 22:34'
updated_date: '2026-06-27 22:52'
labels:
  - ui-ux
dependencies: []
priority: medium
ordinal: 75000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Loading states are a bare 'Loading…' string (app/Loading.tsx and per-page isLoading), causing a text flash then snap to content. Add reusable skeleton components and use them for the main data-heavy pages (roster, sessions/play, leaderboard, dashboard). Audit item #5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A reusable Skeleton primitive (animate-pulse, themed) exists in packages/ui
- [x] #2 Roster/Players, Play, Leaderboard, and Dashboard show skeletons while loading instead of 'Loading…' text
- [x] #3 Skeletons roughly match the final content layout to avoid layout shift
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added Skeleton + SkeletonCard primitives (motion-safe animate-pulse, themed). Replaced bare 'Loading…' text with skeletons on Players, Play, Dashboard (SkeletonCard) and the Leaderboard boards (row skeletons), roughly matching final layout to limit shift.
<!-- SECTION:FINAL_SUMMARY:END -->
