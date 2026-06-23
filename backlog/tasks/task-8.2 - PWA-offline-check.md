---
id: TASK-8.2
title: PWA + offline check
status: Done
assignee: []
created_date: '2026-06-19 10:43'
updated_date: '2026-06-23 09:18'
labels:
  - 'size:S'
  - E07
dependencies: []
parent_task_id: TASK-8
ordinal: 41000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Installable PWA; graceful offline behaviour verified
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added vite-plugin-pwa: web manifest (name, standalone, start_url/scope, theme/background, 192+512+maskable icons), autoUpdate service worker that precaches the app shell (15 entries) with navigateFallback to index.html, and NetworkFirst runtime caching for Supabase reads (fresh online, cached offline). Dependency-free icon generator at scripts/gen-pwa-icons.mjs (npm run gen:icons) draws an emerald shuttlecock. SW only runs in the production build, so dev + Playwright e2e are unaffected. Verify offline via build && preview + DevTools offline toggle (documented in RUNBOOK).
<!-- SECTION:NOTES:END -->
