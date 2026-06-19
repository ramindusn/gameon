---
id: TASK-2.3
title: Auth module + role resolution (admin/player)
status: To Do
assignee: []
created_date: '2026-06-19 10:42'
labels:
  - 'size:M'
  - E01
dependencies:
  - TASK-1.4
parent_task_id: TASK-2
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Supabase auth wrapper exposing role-aware state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 magic-link admin sign-in + nickname/password player sign-in/up
- [ ] #2 resolves role admin|player|null; E2E bypass supported
<!-- AC:END -->
