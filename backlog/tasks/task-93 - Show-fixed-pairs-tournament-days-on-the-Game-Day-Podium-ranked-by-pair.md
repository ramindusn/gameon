---
id: TASK-93
title: 'Show fixed-pairs tournament days on the Game Day Podium, ranked by pair'
status: Done
assignee: []
created_date: '2026-08-27 06:53'
updated_date: '2026-08-27 06:57'
labels: []
dependencies: []
priority: medium
ordinal: 159000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
loadGameDayBoards() filtered on match_sessions.kind = 'casual', so a fixed-pairs tournament day never appeared on the public home's Game Day Podium at all - the day was played, scored and then invisible.

A tournament is ranked by partnership, not by individual, so it cannot simply be folded into the existing player board. GameDayBoard therefore carries both: kind, plus pairStandings built by the existing buildGameDayPairBoard() for tournament days.

The podium for a tournament day shows the top three PAIRS. The individual player board still drives the list underneath, so everyone can find their own line under a pair podium. Casual days are completely unchanged.

Work was already started in the working tree (the api.ts query and GameDayBoard shape); this task finishes the remaining construction sites, the rendering, and the tests.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A fixed-pairs tournament day appears on the Game Day Podium instead of being filtered out
- [x] #2 For a tournament day the podium shows the top three pairs, each labelled with both players' names
- [x] #3 The list under a tournament podium shows individual players, so every participant has their own line
- [x] #4 Casual game days render exactly as before: player podium, with 4th onward listed underneath
- [x] #5 GameDayBoard carries kind and pairStandings, and every construction site (including the E2E seed) supplies them
- [x] #6 Tests cover a tournament board rendering pairs on the podium, and a casual board being unaffected
- [x] #7 npm run typecheck, lint and unit tests all pass
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Picked up from work already in the working tree (the loadGameDayBoards query and the widened GameDayBoard shape); finished the remaining construction sites, the rendering and the tests.

The pair-podium-with-player-list-below layout was not my call - it was already stated in a comment on the WIP ('the player board still drives the everyone else list under a tournament podium, where people want their own line too'), so I implemented that rather than re-deciding it.

Pair rows are shaped to the existing StandingRow ({playerId, name, diff}) with pairId standing in for playerId, so <Podium> needed no changes at all.

Added a fallback the ACs did not ask for: byPair also requires pairRows.length > 0. A tournament created before TASK-80 has no team ids to group by, so buildGameDayPairBoard returns nothing - and an empty podium would be worse than the player one it replaced. Covered by a test.

Under a pair podium the list starts at rank 1, not 4: it is a different population from the podium, so skipping three would drop real players off the card.

Validation: npm test 432 pass (43 files, 2 new in Home.test.tsx), npm run lint clean, npm run typecheck clean.

Not covered: loadGameDayBoards itself has no unit test, since it goes straight to supabase and the repo has no harness for that. The kind/pairStandings grouping is therefore only exercised through the UI fixtures.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed-pairs tournament days now appear on the public home's Game Day Podium; they were filtered out by .eq('match_sessions.kind','casual') and so never showed at all despite being played and scored.

loadGameDayBoards drops that filter, selects team_a_id/team_b_id, and returns kind plus pairStandings (built by the existing buildGameDayPairBoard) alongside the player standings. GameDayRank renders the pairs on the podium for a tournament day - each labelled with both players' names - and lists the individual players beneath, so everyone still finds their own line. Casual days are untouched: player podium, 4th onward below. A tournament with no team ids falls back to the player podium rather than showing an empty one.

Verified with 432 unit tests (2 new covering the pair podium and the no-pairs fallback), clean lint and typecheck.
<!-- SECTION:FINAL_SUMMARY:END -->
