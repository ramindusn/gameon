---
id: TASK-28
title: 'Add-match: DB uniqueness + server-side slot to remove court race'
status: Done
assignee: []
created_date: '2026-06-28 07:00'
updated_date: '2026-06-28 07:41'
labels:
  - ui-ux
dependencies: []
priority: low
ordinal: 82000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From TASK-26: nextSlot computes round/court client-side from possibly-stale data.results, so two quick custom-match adds can collide on (session_id, round, court). Add a DB unique index on match_results(session_id, round, court) and/or compute the next slot server-side so concurrent adds can't duplicate a court.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Unique constraint/index on match_results(session_id, round, court) exists via migration
- [x] #2 Adding two custom matches in quick succession cannot produce two rows with the same (session, round, court)
- [x] #3 A duplicate-court insert fails gracefully with a user-visible error toast (no silent corruption)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added migration 20260628000000_match_results_unique_court.sql creating a unique index on match_results(session_id, round, court). useAddCustomMatch onError now detects Postgres 23505 and shows 'That court was just taken — try adding the match again.' plus refetches the session so the next computed court corrects. Verified generated draws (court=ci+1) and tournament fixtures already assign distinct courts per round, so the index is safe for existing rows. NOTE: migration file is committed but must be applied to dev/prod DBs separately via supabase CLI (not part of the Cloudflare deploy).
<!-- SECTION:NOTES:END -->
