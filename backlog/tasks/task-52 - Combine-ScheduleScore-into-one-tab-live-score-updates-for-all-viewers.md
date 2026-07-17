---
id: TASK-52
title: Combine Schedule+Score into one tab; live score updates for all viewers
status: In Progress
assignee:
  - '@claude'
created_date: '2026-07-17 14:30'
updated_date: '2026-07-17 18:37'
labels: []
dependencies: []
ordinal: 106000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On the live game-day (Play) page, merge the Schedule and Score tabs into one 'Matches' tab (tabs become Matches + Points). Matchmakers get inline score editing there; players see it read-only. Also make score updates realtime: today players only see new scores on refetch (30s stale + focus refetch) and the tables aren't in Supabase's realtime publication at all. Add a Supabase realtime (Postgres changes) subscription that invalidates the session query so players + matchmaker see scores update live, and enable realtime on match_results + match_sessions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Play page has two tabs: Matches (schedule + scores combined) and Points; no separate Schedule/Score tabs
- [ ] #2 On the Matches tab, matchmakers can update scores/line-ups/add-custom/delete inline; non-matchmakers see it read-only (odds before, score + point swing after)
- [ ] #3 match_results and match_sessions are added to the supabase_realtime publication (dev applied; prod migration provided)
- [ ] #4 An open Play page updates scores/standings live when the matchmaker saves, without a manual refresh, for players and matchmakers alike
- [ ] #5 Realtime no-ops safely when Supabase is unconfigured (tests/E2E); existing PlayPage tests pass
<!-- AC:END -->
