---
id: TASK-9.1
title: Public home layout + two login buttons
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-21 19:42'
updated_date: '2026-06-22 12:20'
labels:
  - 'size:M'
  - E08
dependencies: []
parent_task_id: TASK-9
priority: high
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The default logged-out home.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Top bar: Admin login + Matchmaker login buttons
- [x] #2 Sections in order: Scheduled matches, Played matches, Leaderboard (doubles + individual)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Public Home route at '/' (replaces the signed-out login redirect): top nav (GameOn brand, placeholder links, search box, Admin Login + Matchmaker Login buttons -> /login?as=role; when signed in show Dashboard link + Sign out).
2. Hero 'Elevate Your Game' (green 'Game').
3. Sections in order: Scheduled Matches, Recent Results (played), Leaderboard (Doubles + Individual) — empty states for now (data lands in E03/E04/E05); leaderboard reads player_profiles when present.
4. Footer. LoginPage reads ?as= to preselect the tab.
5. Black+green theme + top-nav per saved preference. lint/build/tests + e2e for the two login buttons.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Public Home at '/' (replaces the signed-out login redirect). Top bar: GameOn brand, placeholder nav, search box, Admin Login + Matchmaker Login buttons (-> /login?as=role; LoginPage preselects the tab). Hero 'Elevate Your Game'. Sections in order: Scheduled Matches, Recent Results (played), Leaderboard (Doubles + Individual) — empty states until E03/E04/E05 supply data. Signed-in users see a Dashboard/My-area link + Sign out instead of login buttons. Black+green theme + top-nav. e2e home.spec covers the two login buttons; full suite 16 green.
<!-- SECTION:NOTES:END -->
