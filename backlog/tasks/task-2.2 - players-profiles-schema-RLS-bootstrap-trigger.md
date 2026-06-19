---
id: TASK-2.2
title: players/profiles schema + RLS + bootstrap trigger
status: To Do
assignee: []
created_date: '2026-06-19 10:42'
labels:
  - 'size:M'
  - E01
dependencies:
  - TASK-1.4
parent_task_id: TASK-2
priority: high
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Multi-tenant player table + admin allowlist bootstrap.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 player_profiles (club_id, optional user_id, nickname, skill, absent) with RLS
- [ ] #2 trigger enrolls non-admin signups as players; admins via allowlist
<!-- AC:END -->
