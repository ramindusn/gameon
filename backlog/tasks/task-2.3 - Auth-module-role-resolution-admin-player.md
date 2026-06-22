---
id: TASK-2.3
title: Auth module + role resolution (admin / matchmaker)
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-19 10:42'
updated_date: '2026-06-22 10:05'
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
Resolve role admin|matchmaker|none. No player auth.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 magic-link admin sign-in + nickname/password player sign-in/up
- [x] #2 resolves role admin|player|null; E2E bypass supported
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Implement per ADR 0010 (role = admin|matchmaker|null; AC wording predates it).
1. Restructure @gameon/supabase: extract client into client.ts; add auth.ts — Role type, usernameToEmail (synthetic email), decideRole (pure), signInAdmin (magic-link OTP), signInMatchmaker (username->synthetic email + password), signOut, resolveRole (query admins self-read + player_profiles.is_matchmaker). E2E bypass via sessionStorage gated by VITE_E2E. Re-export from index.ts.
2. Unit tests: usernameToEmail, decideRole, and E2E bypass (sign-in sets role, resolveRole reads it, signOut clears).
3. Thin React layer in app: AuthProvider + useAuth hook; App.tsx shows resolved role + sign-out (data-testid) so the bypass is observable for TASK-2.6.
4. Verify: lint, tsc/build, unit tests. Sign-up is admin-driven (no self-service) per REQUIREMENTS; only sign-in implemented.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented per ADR 0010 (AC wording predated it: roles are admin|matchmaker|null, not 'player'; matchmaker uses username+password, not nickname).
- @gameon/supabase restructured: client.ts (typed client) + auth.ts. auth.ts exports Role, usernameToEmail (synthetic email), decideRole (pure), signInAdmin (magic-link OTP), signInMatchmaker (username->synthetic email + password), signOut, resolveRole (admins self-read + player_profiles.is_matchmaker -> decideRole). E2E bypass gated by VITE_E2E, role stored in sessionStorage.
- Self-service sign-up intentionally omitted (REQUIREMENTS: accounts are admin/matchmaker-created); only sign-in.
- React: AuthProvider + useAuth hook in app; App.tsx shows resolved role + sign-out (data-testid=auth-role) so the bypass is observable for TASK-2.6. main.tsx wraps in provider; App.test.tsx updated.
- Tests: 5 unit tests (usernameToEmail, decideRole, e2e admin/matchmaker sign-in + signOut). lint/build/tsc/unit (9) green; formatting clean.
<!-- SECTION:NOTES:END -->
