---
id: TASK-8.4
title: README/runbook + ADR index
status: Done
assignee: []
created_date: '2026-06-19 10:43'
updated_date: '2026-06-23 09:11'
labels:
  - 'size:S'
  - E07
dependencies: []
parent_task_id: TASK-8
ordinal: 43000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Setup/run/deploy runbook + ADR index in docs/
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added docs/RUNBOOK.md covering setup (prereqs, .env, supabase db push), run, test, lint, build, and deploy (Cloudflare Pages build cmd/output/env + SPA redirect; Supabase Edge Function deploy). Refreshed root README (was 'skeleton only') into a quick-start + docs index. Completed the ADR index with the missing 0009 (Tailwind). All doc links verified.
<!-- SECTION:NOTES:END -->
