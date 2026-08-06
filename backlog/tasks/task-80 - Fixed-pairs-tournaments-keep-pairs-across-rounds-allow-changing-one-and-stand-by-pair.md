---
id: TASK-80
title: >-
  Fixed-pairs tournaments: keep pairs across rounds, allow changing one, and
  stand by pair
status: In Progress
assignee:
  - '@claude'
created_date: '2026-08-06 04:26'
updated_date: '2026-08-06 04:35'
labels:
  - feature
dependencies: []
priority: high
ordinal: 146000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Three gaps in fixed-pairs (tournament) game days, all confirmed in the code.

1. ADDING A ROUND RESHUFFLES PARTNERS. PlayPage's RoundBuilder.autoFill() calls generateRounds(pool, 1, {courts}) — the casual skill balancer — regardless of session.kind. It re-pairs everyone, so a new round in a tournament breaks the locked pairs. The page already knows the kind (it uses session.kind === 'tournament' for the icon and label at PlayPage.tsx ~535) but the round builder never consults it.

2. A PAIR CANNOT BE CHANGED. Pairs are locked once in TournamentSetup (GeneratePage.tsx ~455) and written as fixtures at creation. Afterwards there is no way to change who is partnered with whom. The existing line-up edit on PlayPage replaces the four players of ONE match, which is not the same thing — it does not follow the pair through the rest of the schedule.

3. STANDINGS ARE PER-PLAYER, NOT PER-PAIR. buildGameDayBoard() (apps/badminton/src/ranking/api.ts:163) aggregates by playerId. In a fixed-pairs day both partners always have identical played/wins/diff, so the standings list every pair twice as two identical rows. The user wants doubles standings — one row per pair.

NOTE: TASK-12.2 built fixed-pair standings math and TASK-39 later removed the separate Fixed Pairs board when tournaments were folded into the Individual+Doubles rankings. Check what survived before rebuilding it; the aggregation may only need a pair-keyed variant of buildGameDayBoard rather than new math.

OPEN DESIGN QUESTIONS (agree before building):
- Adding a round: continue the round-robin from the next unplayed fixture, or start another pass over the same pairs?
- Changing a pair: rewrite only future unplayed fixtures, or all of them? What happens to already-scored matches involving that pair?
- Standings: replace the per-player view in tournaments, or offer both?
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Adding a round to a fixed-pairs game day keeps the locked pairs
- [ ] #2 A pair can be changed after the game day has started
- [ ] #3 Tournament standings show one row per pair, not one per player
- [ ] #4 Casual game days are unaffected
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Decisions confirmed with the user: next unplayed fixture (round-robin continues, wrapping into a second pass); changing a pair rewrites FUTURE unplayed matches only; standings show pairs only.

DONE so far:
1. Adding a round keeps the pairs. nextTournamentRound(pairCount, roundsPlayed) in @gameon/domain walks the round-robin schedule and wraps into another pass once exhausted. PlayPage derives the locked pairs from the teams already on the schedule and RoundBuilder.autoFill uses them for a tournament, falling back to the casual skill balancer otherwise. Tested: 4 pairs cover all 6 matchups in 3 rounds with no re-pairing; round 4 repeats round 1; with 5 pairs exactly one pair rests each round and everyone rests once.
3. Pair standings. buildGameDayPairBoard() + pairKey() in ranking/api.ts key by sorted pair, so the same pair aggregates whichever side of the net it is on; a half-empty team is skipped rather than treated as a pair. PlayPage renders PairPointsTab on tournament days. No Ranking column there — that is a per-player rating delta and summing two would mean nothing.

STILL TO DO: (2) changing a pair mid-tournament — needs a UI and a rewrite of unplayed fixtures.

375 unit tests pass.
<!-- SECTION:NOTES:END -->
