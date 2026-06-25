---
id: TASK-13
title: 'Security: invite-only signups — close matchmaker auto-enrol hole'
status: To Do
assignee: []
created_date: '2026-06-25 12:43'
labels:
  - security
dependencies: []
ordinal: 67000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The handle_new_auth_user trigger enrolled ANY non-admin auth user as a matchmaker, so typing an email into the Admin magic-link box auto-created a matchmaker (e.g. Pasindu via pasindupadmathilaka@gmail.com). Harden the trigger so matchmakers are only created by the admin-run create-matchmaker flow (synthetic email / username metadata); other self sign-ups are rejected (invite-only). Also demote/remove the stray Pasindu account.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Random email in the Admin login no longer creates a matchmaker (signup rejected); admin allowlist onboarding + create-matchmaker still work; stray Pasindu matchmaker demoted to a plain roster player + its auth account removed
<!-- AC:END -->
