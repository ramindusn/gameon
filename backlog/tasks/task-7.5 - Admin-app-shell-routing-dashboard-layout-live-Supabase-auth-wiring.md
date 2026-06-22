---
id: TASK-7.5
title: 'Admin app shell: routing + dashboard layout + live Supabase auth wiring'
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-22 10:36'
updated_date: '2026-06-22 12:16'
labels:
  - E06
  - frontend
dependencies: []
parent_task_id: TASK-7
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wire the app to the live Supabase project (env) so admin magic-link login works end-to-end, add client-side routing, and build the Emerald Pro dashboard shell (sidebar nav + header). After admin login the app navigates to the club-ops dashboard. Foundation for E06 fund/inventory UI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 App wired to live Supabase via env (publishable key); admin magic-link sign-in completes and resolves role=admin
- [x] #2 Client-side routing added; admin lands on /dashboard after login; routes gated by role
- [x] #3 Emerald Pro dashboard shell (sidebar + header) renders the club-ops dashboard area
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Done: app wired to live Supabase (env), react-router with role-gated /dashboard + /matchmaker, admin lands on /dashboard after login. Shell evolved to a top-nav layout (left sidebar removed per user) in the retuned black+green theme. Login round-trip confirmed working on the live DB.
<!-- SECTION:NOTES:END -->
