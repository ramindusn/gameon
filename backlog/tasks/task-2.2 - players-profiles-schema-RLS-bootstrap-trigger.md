---
id: TASK-2.2
title: players/profiles schema + RLS + bootstrap trigger
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-19 10:42'
updated_date: '2026-06-22 09:55'
labels:
  - 'size:M'
  - E01
dependencies:
  - TASK-1.4
parent_task_id: TASK-2
priority: high
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players are no-login data. Matchmaker = a player row with a role/login. Admin is separate. Multi-tenant club_id + RLS (public-read where needed).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 player_profiles (club_id, optional user_id, nickname, skill, absent) with RLS
- [x] #2 trigger enrolls non-admin signups as players; admins via allowlist
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Migration adds: admin_allowlist(email pk, club_id), admins(user_id pk, club_id), player_profiles(id, club_id, user_id unique nullable, nickname, username unique nullable, skill 1-5, is_matchmaker, absent, timestamps).
2. Security-definer helpers is_admin(club)/is_matchmaker(club) to avoid RLS recursion.
3. RLS: player_profiles public-read; insert/update/delete for admin or matchmaker of same club. admins/admin_allowlist: no anon access (service-role/own-row only).
4. Bootstrap trigger on auth.users insert: email in admin_allowlist -> admins row; else enroll as player_profile (is_matchmaker=true) using raw_user_meta_data (club_id/nickname/username/skill), single-club fallback for club_id.
5. Apply via supabase db push to linked remote; regenerate TS types; verify with get_advisors.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Two migrations applied to remote + verified locally:
- 20260622080321_identity_players_admins: player_profiles(club_id, user_id unique nullable, nickname, username unique, skill 1-5, is_matchmaker, absent, timestamps + updated_at trigger), admins, admin_allowlist; bootstrap club row (idempotent). RLS: player_profiles public-read + matchmaker/admin write; admins self-read; admin_allowlist deny-all. security-definer is_admin/is_matchmaker helpers (no policy recursion).
- 20260622081141_identity_harden_funcs: explicit anon/authenticated table GRANTs (RLS needs them; also fixed pre-existing dead clubs_public_read), search_path pin + EXECUTE revokes on SECURITY DEFINER fns.
Bootstrap trigger verified in local DB: allowlisted email -> admin (no profile); else -> matchmaker profile w/ metadata + single-club fallback. RLS verified: anon read-only, matchmaker can write roster, admin self-read scoped. Security advisors clean of all introduced findings (remaining: intentional deny-all INFO + pre-existing rls_auto_enable). Regenerated typed Database into packages/supabase/src/database.types.ts and typed the shared client. lint/build/tsc/unit tests green.
<!-- SECTION:NOTES:END -->
