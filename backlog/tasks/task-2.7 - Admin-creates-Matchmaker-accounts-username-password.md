---
id: TASK-2.7
title: Admin creates Matchmaker accounts (username + password)
status: Done
assignee: []
created_date: '2026-06-22 12:55'
updated_date: '2026-06-22 13:00'
labels:
  - E01
  - auth
dependencies: []
parent_task_id: TASK-2
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Admins create Matchmaker logins. Privileged op via a Supabase Edge Function (service role, ADR 0003) that verifies the caller is an admin, then creates an auth user with the matchmaker synthetic email + password + metadata; the bootstrap trigger enrols them as a Matchmaker player_profile. Admin-only UI on the Players page.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Edge Function create-matchmaker: admin-verified, creates auth user (username->synthetic email) + password; trigger enrols as matchmaker
- [x] #2 Admin-only UI to create a matchmaker (name/username + password); new matchmaker appears in the roster
- [x] #3 Non-admins cannot create matchmakers (server + UI)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Edge Function supabase/functions/create-matchmaker (deployed, verify_jwt): verifies caller is an admin (admins self-read), then service-role auth.admin.createUser with the matchmaker synthetic email + password + metadata (username/nickname/club_id); bootstrap trigger enrols them as a matchmaker player_profile. Client: roster/api.createMatchmaker via functions.invoke (surfaces JSON error). UI: admin-only 'Add matchmaker' on Players page (name/username/password modal) -> invalidates roster so the new matchmaker appears. Non-admins blocked at UI (button hidden) + server (401 verify_jwt / 403 non-admin). REQUIREMENTS.md updated (admins not players; matchmaker is player; game-day name+lock rules for E03/E04). Verified deploy returns 401 without auth; 40 unit + 22 e2e green. End-to-end create needs a real admin session to exercise.
<!-- SECTION:NOTES:END -->
