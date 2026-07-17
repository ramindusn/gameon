---
id: TASK-49
title: 'Fix: Create game day button stuck disabled (clubId lost on roster refetch)'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-07-17 10:33'
updated_date: '2026-07-17 10:33'
labels: []
dependencies: []
ordinal: 103000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Matchmakers sometimes find the 'Create game day' button disabled after generating a draw. The button is disabled when the roster query's clubId is null. resolveClubId() used db.auth.getUser() — a network call to the auth server that can transiently return no user, resolving clubId to null. TanStack Query then caches that null (staleTime 30s + refetchOnWindowFocus), so a background refetch after tab/window focus silently replaces a good clubId with null and disables the button. Fix reads the locally-cached session via getSession() (no network) instead; the caller is already past ProtectedRoute so the session is present.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 resolveClubId resolves the matchmaker's club from the local session without a getUser() network call
- [ ] #2 A transient auth-server hiccup no longer nulls clubId / disables Create game day
- [ ] #3 Admin path (club from admins table) is unchanged; existing roster tests pass
<!-- AC:END -->
