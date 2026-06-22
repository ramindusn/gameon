---
id: TASK-2.6
title: e2e for admin + matchmaker login
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-19 10:42'
updated_date: '2026-06-22 10:15'
labels:
  - 'size:S'
  - E01
dependencies:
  - TASK-1.6
parent_task_id: TASK-2
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Playwright covers admin + matchmaker sign-in.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Playwright covers admin + player sign-in paths
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
e2e/auth.spec.ts: Playwright drives the real login UI via the VITE_E2E bypass. Covers admin magic-link sign-in (-> Role: admin), matchmaker username+password sign-in (-> Role: matchmaker), and sign-out returning to the chooser. Runs on chromium + mobile-chrome; full e2e suite 10/10 green.
<!-- SECTION:NOTES:END -->
