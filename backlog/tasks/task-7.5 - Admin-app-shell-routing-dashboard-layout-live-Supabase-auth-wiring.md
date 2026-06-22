---
id: TASK-7.5
title: 'Admin app shell: routing + dashboard layout + live Supabase auth wiring'
status: In Progress
assignee:
  - '@ramindusn'
created_date: '2026-06-22 10:36'
updated_date: '2026-06-22 10:41'
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
- [ ] #1 App wired to live Supabase via env (publishable key); admin magic-link sign-in completes and resolves role=admin
- [ ] #2 Client-side routing added; admin lands on /dashboard after login; routes gated by role
- [ ] #3 Emerald Pro dashboard shell (sidebar + header) renders the club-ops dashboard area
<!-- AC:END -->
