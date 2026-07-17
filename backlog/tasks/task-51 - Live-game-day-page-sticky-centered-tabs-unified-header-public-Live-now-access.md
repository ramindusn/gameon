---
id: TASK-51
title: >-
  Live game-day page: sticky centered tabs, unified header, public 'Live now'
  access
status: In Progress
assignee:
  - '@claude'
created_date: '2026-07-17 13:39'
updated_date: '2026-07-17 14:00'
labels: []
dependencies: []
ordinal: 105000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Polish the public live game-day (Play) page and give players a way to reach it. (1) Make the Schedule/Points/Score tab bar sticky so it stays visible while scrolling the rounds, centered and styled as a clean bar. (2) Consolidate the redundant page title + session summary + tabs into one cohesive header component (drop the duplicated AppShell 'Game day' h1 above the session card). (3) Add a public 'Live now' entry on the Home page linking players to the live game day's /play/:id — currently the page is only reachable by direct URL.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The tab bar (Schedule/Points/Score) is sticky: it stays pinned below the top nav while the rounds/points scroll underneath
- [ ] #2 Tabs are horizontally centered and read as one clean bar
- [ ] #3 The session summary and tabs read as a single cohesive header; the duplicate 'Game day' page title above the card is removed
- [ ] #4 The public Home shows a 'Live now' card linking to /play/:id when a casual game day is live (hidden ones excluded); it is absent when nothing is live
- [ ] #5 Existing PlayPage behaviour + tests still pass
<!-- AC:END -->
