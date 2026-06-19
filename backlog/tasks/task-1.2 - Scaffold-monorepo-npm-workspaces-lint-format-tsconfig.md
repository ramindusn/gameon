---
id: TASK-1.2
title: Scaffold monorepo (npm workspaces) + lint/format/tsconfig
status: To Do
assignee: []
created_date: '2026-06-19 09:14'
labels:
  - 'size:M'
  - E00
dependencies: []
parent_task_id: TASK-1
priority: high
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Set up the npm-workspaces monorepo with shared tooling.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Root package.json with workspaces for apps/* and packages/*
- [ ] #2 apps/badminton is a Vite + React + TS app that builds
- [ ] #3 Shared eslint + prettier + tsconfig base; packages import-able from the app
<!-- AC:END -->
