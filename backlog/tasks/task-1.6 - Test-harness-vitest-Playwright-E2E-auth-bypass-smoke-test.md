---
id: TASK-1.6
title: 'Test harness: vitest + Playwright + E2E auth bypass + smoke test'
status: Done
assignee: []
created_date: '2026-06-19 09:14'
updated_date: '2026-06-21 22:56'
labels:
  - 'size:M'
  - E00
dependencies: []
parent_task_id: TASK-1
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establish the testing gate and an e2e auth bypass from day one.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 vitest runs unit tests; Playwright runs e2e
- [x] #2 VITE_E2E bypass lets e2e sign in without real email
- [x] #3 A smoke test renders the app shell
<!-- AC:END -->
