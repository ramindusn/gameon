---
id: TASK-89
title: Re-clone prod data into dev to test the live ranking work
status: To Do
assignee: []
created_date: '2026-08-09 08:08'
labels:
  - ops
dependencies: []
priority: high
ordinal: 155000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Dev's data has drifted from prod: different 9 Aug session, 194 match_results vs prod's 209, and Sahan unlinked. The TASK-87 ranking change needs testing against real matches, and prod must not be touched.

Simpler than the TASK-74 clone because prod now HAS holdings (5 rows) - the manual stock rebuild that job needed is gone. Schemas are level: dev and prod share every migration through 20260809030000.

Established facts, do not re-derive:
- prod = avkijzzrurkefguxkbji (read-only MCP), dev = xlovjvvhsemqaqbknmyi (CLI linked, write path is 'supabase db push')
- Docker is down, so 'supabase db dump' is unusable both ways; dev reads go through 'supabase db query --linked'
- There are NO foreign keys from any table to auth.users. prod's user_id values can be copied verbatim; dev simply will not resolve them to logins
- Do NOT copy or wipe clubs / admins / admin_allowlist. Remap prod's club_id onto dev's existing club (7ae331e3-3824-41c8-9892-ebdb6545ca48). Copying prod's club row cascade-deletes dev's admins and breaks admin login
- Dev auth users: ramindusn@gmail.com (admin), ramboo@matchmaker.gameon.local (matchmaker). After loading, relink the Ramboo profile's user_id to dev's own auth uuid or matchmaker login stays broken
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dev holds prod's rows, counts matching prod exactly
- [ ] #2 Prod is never written to
- [ ] #3 Admin and matchmaker login both still work in dev
- [ ] #4 The live 9 Aug game day is present with its scored matches, so the ranking column and per-match figures can be checked against real data
- [ ] #5 Started by Sahan resolves on the three backfilled game days
<!-- AC:END -->
