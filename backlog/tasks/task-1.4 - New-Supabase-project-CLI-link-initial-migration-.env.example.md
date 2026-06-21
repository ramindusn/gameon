---
id: TASK-1.4
title: New Supabase project + CLI link + initial migration + .env.example
status: Done
assignee: []
created_date: '2026-06-19 09:14'
updated_date: '2026-06-21 22:46'
labels:
  - 'size:M'
  - E00
dependencies: []
parent_task_id: TASK-1
priority: high
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stand up the second free Supabase project and wire tracked migrations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 New free Supabase project created (separate from the prototype)
- [x] #2 supabase CLI linked; an initial tracked migration applies cleanly via db push
- [x] #3 .env.example documents VITE_SUPABASE_URL/ANON; secrets never committed
<!-- AC:END -->
