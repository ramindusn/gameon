---
id: TASK-75
title: Backfill usage_entries.session_id in prod
status: Done
assignee:
  - '@claude'
created_date: '2026-08-05 12:30'
updated_date: '2026-08-05 20:33'
labels:
  - ops
dependencies: []
priority: medium
ordinal: 136000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prod's usage_entries predate the session_id column (added in 20260804030000_game_day_usage.sql), so every game day in prod shows as 'missing usage' even though the usage was recorded from the admin side. The same correction was applied to dev under TASK-74 and verified there; this task ports it to prod.

MAPPING (established against prod data on 2026-08-05, prod read-only):
Nine of prod's eleven usage entries sit roughly 3 hours after exactly one game day and map 1:1 by nearest played_at:
  2026-06-28 08:00 -> 4f6ef52d  |  2026-07-05 07:30 -> fc53713e
  2026-07-08 19:30 -> e66df8c3  |  2026-07-12 07:30 -> 0581fcc2
  2026-07-15 19:30 -> f3b0177f  |  2026-07-22 22:06 -> 5e445a7f
  2026-07-26 12:21 -> 17af3673

TWO DATES RAN TWO GAME DAYS BUT WERE LOGGED AS ONE ENTRY, which a single-column FK cannot express. User's decision: split into one entry per game day, apportioned by rounds played, leaving club totals unchanged.
  2026-06-23  entry d037b9b6, 6x RSL     -> 11a619aa (16:00, 9 rounds) 3 shuttles + 0c6cd9a1 (17:10, 12 rounds) 3 shuttles
  2026-07-19  entry cc24760b, 6x Victor  -> b8a3f660 (04:30, 12 rounds) 4 shuttles + 7219fbf8 (06:42, 8 rounds) 2 shuttles
In dev the split halves were given synthetic ids aaaa0623-0000-4000-8000-000000000001 and aaaa0719-0000-4000-8000-000000000002 so they stay identifiable; prod should do the same.

DELIBERATELY LEFT UNLINKED: the two earliest entries (2026-06-17 20:00, 4 shuttles; 2026-06-21 08:00, 6 shuttles) predate every recorded game day. They are club-level usage and should keep session_id null.

Totals must not move: 61 shuttles across 13 entries / 14 usage_items after the split (11 entries / 12 items before).

CAUTION: prod ids above are prod's own and were valid on 2026-08-05 — re-verify before running, since prod may have gained game days or usage since. Unlike dev, prod must NOT be wiped: this is an UPDATE of session_id plus two INSERTs, nothing else.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every prod game day that had admin-side usage resolves to a linked usage entry
- [x] #2 The two pre-game-day entries (Jun 17, Jun 21) remain unlinked
- [x] #3 Club shuttle totals are unchanged by the backfill (61 across the copied range)
- [x] #4 The mapping is re-verified against live prod data before the write, not taken from this description on faith
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Applied to prod 2026-08-05. Mapping recomputed from live prod first (AC #4) and it reproduced the recorded plan exactly: nine entries 0.8-8.3h after one game day, Jun 23 and Jul 19 with two each, the two June entries 56h and 140h from anything.

Rehearsed on dev before touching prod — dev already held this end state from the TASK-74 clone, so it was a free test of idempotency: it changed nothing and still passed every assertion.

Result on prod: 13 entries, 11 linked, 2 unlinked, 61 shuttles (unchanged), 0 game days missing usage. 193 match results and 184 attendance rows untouched.

holder_id left null on every item, deliberately: those shuttles came from the old club pool and Ramboo's holdings were derived from products.barrels which was ALREADY net of them. Naming a holder would mean a later delete credited him stock never deducted from him.

Run as a one-off and removed from migration history rather than committed, since dev must not re-run it.
<!-- SECTION:NOTES:END -->
