---
id: TASK-88
title: >-
  Seed the live-day rating preview from stored ratings instead of replaying
  history
status: Done
assignee:
  - '@claude'
created_date: '2026-08-09 07:57'
updated_date: '2026-08-17 13:56'
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
- [x] #1 The live-day preview seeds from player_ratings and rates only the current day
- [x] #2 computeRatings takes an optional seed; with no seed it behaves exactly as now
- [x] #3 A stale seed is detected and falls back to the full replay, since the recompute call on finish is best-effort and can fail silently
- [x] #4 Per-match figures still sum exactly to the day total
- [x] #5 The browser still writes nothing to player_ratings
- [x] #6 Measured: the live-day fetch and compute are materially smaller than the 61 KB / 17 ms baseline
<!-- AC:END -->





## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
DONE. computeRatings takes an optional seed; the live-day preview reads the stored boards instead of replaying the season.

## Measured on prod, not estimated

Live-day fetch: 125,158 bytes -> 29,080 bytes (23%). Breakdown of what remains:
player_ratings 2.4 KB, pair_ratings 14.7 KB, the day's own matches ~12 KB. The
part that grows with the season - 244 match_results plus 239 attendance rows -
is gone entirely.

The 61 KB / 17 ms figure in the description was from 9 Aug; the club has played
since, which is the point.

## Correctness, pinned twice

1. Domain test: a synthetic season replayed both ways, boards compared to TEN
   decimal places on rating, rd, vol and games.
2. Against prod's real 14 game days and 244 matches: rating a brand-new day
   seeded vs replayed agreed to NINE decimals for every player. Run from a
   throwaway test against an export of prod; not kept in the repo.

## Two constraints the code enforces rather than assumes

Only a LIVE day is seeded. The stored boards are the state AFTER every finished
day, so for a finished target they already contain it - rating it again would
count the day twice, and there is no way to ask them for the state before it.
Finished days still replay, which is the path that existed before TASK-87.

A stale seed is refused. The recompute is best-effort (logs, does not throw), so
a failed one leaves the boards behind. The guard is an invariant rather than a
timestamp: every scored match feeds exactly four player-games, so sum(games)
must equal 4x the scored matches in finished days. Verified on prod before
relying on it (976 = 4 x 244) and unit-tested in both directions, including the
no-ratings-at-all case.

## Deliberately not done

The seed fetches pair_ratings (14.7 KB, half of what remains) even though the
delta paths only read the player board. Dropping it would roughly halve the
payload again, but RatingSeed.pairs would have to become optional, and a future
caller reading pair figures from a pairless seed would get silently wrong
numbers. Not worth the trap at this size. Revisit if the club's partnership
count grows a lot.

## Worth knowing

The live game-day page makes ~20 Supabase calls totalling ~150 KB. The ranking
work is now a small slice of that; the rest is roster, session, usage and
pair-board queries. Separate piece of work if page weight ever matters.
<!-- SECTION:NOTES:END -->
