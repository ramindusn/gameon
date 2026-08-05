---
id: TASK-76.1
title: Phase 0 — one navigation shape on every page
status: Done
assignee: []
created_date: '2026-08-05 17:58'
updated_date: '2026-08-05 18:25'
labels:
  - ui
dependencies: []
parent_task_id: TASK-76
ordinal: 138000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Home.tsx and PlayerProfilePage.tsx render their own header instead of using AppShell, so the role nav and the mobile bottom tab bar disappear on those two routes. Move both onto AppShell, keeping their hero//custom content as page content rather than as a competing header. Nav items themselves already match across breakpoints and should not change.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Home and the player profile use AppShell like every other route
- [ ] #2 The mobile bottom tab bar is present on every signed-in page, including Home and player profiles
- [ ] #3 Home's public hero and the profile's header survive as page content
<!-- AC:END -->
