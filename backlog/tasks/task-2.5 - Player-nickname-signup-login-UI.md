---
id: TASK-2.5
title: Matchmaker login UI
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-19 10:42'
updated_date: '2026-06-22 10:12'
labels:
  - 'size:M'
  - E01
dependencies:
  - TASK-1.5
parent_task_id: TASK-2
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Matchmaker authenticates (see ADR). No player self-signup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Matchmaker can log in; players never sign up
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
MatchmakerLogin.tsx: username + password -> signInMatchmaker (username->synthetic email + signInWithPassword); surfaces auth errors. No signup UI — explicit note 'players don't sign in; accounts created by an admin' (REQUIREMENTS). useAuth wrappers now return the sign-in result so forms can show bad-credential errors. data-testids: mm-username, mm-password, mm-login-submit, mm-login-error. Covered by login.test.tsx (matchmaker flow). Also added RTL cleanup to vitest.setup.ts (no globals:true) for test isolation.
<!-- SECTION:NOTES:END -->
