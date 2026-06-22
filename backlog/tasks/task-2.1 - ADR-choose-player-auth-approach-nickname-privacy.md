---
id: TASK-2.1
title: 'ADR: auth model - Admin + Matchmaker logins; players no login'
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-19 10:42'
updated_date: '2026-06-22 07:22'
labels:
  - 'size:S'
  - E01
dependencies: []
parent_task_id: TASK-2
priority: high
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decide login mechanism for Admin and Matchmaker (magic-link vs password). Players are data only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ADR recorded with chosen approach + rationale
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Recorded ADR 0010: Admin = email magic-link (passwordless OTP); Matchmaker = username + password via synthetic email on Supabase Auth; players never authenticate. Role resolved server-side from DB + enforced by RLS, not the login button. Added to docs/adr/README.md index. Username uniqueness + storage deferred to TASK-2.2/2.3.
<!-- SECTION:NOTES:END -->
