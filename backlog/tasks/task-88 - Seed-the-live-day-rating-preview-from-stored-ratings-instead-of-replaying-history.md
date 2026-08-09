---
id: TASK-88
title: >-
  Seed the live-day rating preview from stored ratings instead of replaying
  history
status: To Do
assignee: []
created_date: '2026-08-09 07:57'
labels: []
dependencies: []
priority: medium
ordinal: 154000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The live game-day page replays the club's entire match history to establish where everyone stands, then applies the day's matches on top. That is correct but wasteful: player_ratings already stores exactly that starting point (rating, rd, volatility, games) in 14 rows, written by the recompute Edge Function when a day is finished.

Measured cost of the replay today: 61 KB fetched and 17 ms of compute on the live-day path - a path that did no work at all before TASK-87. Projected at four years of weekly play: roughly 1 MB and 98 ms. The download is the part that does not improve with a faster phone, and it hits every viewer including signed-out ones on the public page.

Seeding instead would mean one rating period rather than twelve, and about 1 KB rather than 61 KB, staying constant however long the club plays.

## Why not localStorage

Considered caching the starting point in the browser. player_ratings IS that cache, on the server, always correct and shared by everyone. A local copy would still need a validity check on every load - has a day been finished since? - and that check is the same size query as simply reading the rows. Staleness risk for no saving.

## Why the browser must not write the result back

player_ratings is service-role only by design (the ranking migration: 'the boards are NEVER written by app users - only the service-role recompute'). A client that may write ratings may write any ratings, and a compare-and-swap check does not help: it guards against races, not against a wrong or tampered client. Storing a live day's ratings would also move the leaderboard mid-day, breaking one-finished-day-equals-one-rating-period, and would need unwinding whenever a score is edited. If live figures ever need storing, the Edge Function does it - it is already the only writer.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The live-day preview seeds from player_ratings and rates only the current day
- [ ] #2 computeRatings takes an optional seed; with no seed it behaves exactly as now
- [ ] #3 A stale seed is detected and falls back to the full replay, since the recompute call on finish is best-effort and can fail silently
- [ ] #4 Per-match figures still sum exactly to the day total
- [ ] #5 The browser still writes nothing to player_ratings
- [ ] #6 Measured: the live-day fetch and compute are materially smaller than the 61 KB / 17 ms baseline
<!-- AC:END -->
