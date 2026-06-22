---
id: TASK-2.4
title: Admin magic-link login UI
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-19 10:42'
updated_date: '2026-06-22 10:12'
labels:
  - 'size:S'
  - E01
dependencies:
  - TASK-1.5
parent_task_id: TASK-2
ordinal: 18000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admin can request + complete magic-link sign-in
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AdminLogin.tsx: email field -> signInAdmin (magic-link OTP). Real mode shows 'magic link sent' confirmation (link completes sign-in in inbox); under VITE_E2E the bypass resolves role=admin immediately. Reachable via the signed-out login chooser (Admin tab) in App.tsx. data-testids: admin-email, admin-magic-link-submit, admin-magic-link-sent, admin-login-error. Covered by login.test.tsx (admin flow + sign-out).
<!-- SECTION:NOTES:END -->
