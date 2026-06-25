---
id: TASK-14
title: Promote existing player to matchmaker (instead of creating a new one)
status: In Progress
assignee: []
created_date: '2026-06-25 12:58'
updated_date: '2026-06-25 13:03'
labels:
  - E10
dependencies: []
ordinal: 68000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Admins should promote an existing roster player to matchmaker (since a matchmaker is a player), rather than the Add-matchmaker flow creating a brand-new person. Change: trigger links a login to an existing player_profile via player_id metadata; create-matchmaker takes player_id+username+password and validates the player; the modal becomes a player picker + username/password.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Admin picks an existing non-matchmaker player + sets username/password; that player's profile gets is_matchmaker=true + the login (no duplicate profile); invite-only protection still holds
<!-- AC:END -->
