---
id: TASK-21
title: Skeleton loaders to replace bare 'Loading…' text
status: To Do
assignee: []
created_date: '2026-06-27 22:34'
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
- [ ] #1 A reusable Skeleton primitive (animate-pulse, themed) exists in packages/ui
- [ ] #2 Roster/Players, Play, Leaderboard, and Dashboard show skeletons while loading instead of 'Loading…' text
- [ ] #3 Skeletons roughly match the final content layout to avoid layout shift
<!-- AC:END -->
