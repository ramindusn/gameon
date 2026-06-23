---
id: TASK-8.3
title: Deploy to Cloudflare Pages + domain/subdomain
status: Done
assignee: []
created_date: '2026-06-19 10:43'
updated_date: '2026-06-23 14:43'
labels:
  - 'size:M'
  - E07
dependencies: []
parent_task_id: TASK-8
ordinal: 42000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 App deploys to Cloudflare Pages; dev on pages.dev; subdomain plan documented (apex untouched)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deployed to Cloudflare Pages (project 'badmintonduo') via npm run deploy (wrangler pages deploy apps/badminton/dist). Live at https://badmintonduo.pages.dev. SPA deep links handled by public/_redirects. Build bakes in apps/badminton/.env (remote Supabase). Custom subdomain play.badmintonduo.club + apex-untouched plan documented in RUNBOOK/ADR 0008 (not yet attached).
<!-- SECTION:NOTES:END -->
