---
id: TASK-90
title: Doubles pair profile page
status: To Do
assignee: []
created_date: '2026-08-12 15:03'
labels: []
dependencies: []
priority: medium
ordinal: 156000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A partnership has a Glicko rating and 64 of them exist in prod, but there is nowhere to look one up. The Doubles board ranks pairs and stops there; a player's profile lists partners with a win record and stops there.

Most of the machinery is already in place:
- pair_ratings, maintained by the recompute Edge Function, drives the Doubles board
- computeRatings rates pairs alongside players, period by period, so a pair's rating trend is computable exactly like a player's
- pairKey gives a stable, order-independent id, so Ramboo|Sahan and Sahan|Ramboo are one pair
- computePartnerStats / computeOpponentStats already exist for the player profile
- loadPlayerHistory returns partnerId per match, so a pair's matches are that history filtered to the partner

What is missing is a route and a page. Mirror PlayerProfilePage so it reads as the same app.

Provisional pairs matter: most partnerships have played once or twice, and their ratings are noise. The Doubles board already hides those behind an established filter - the profile should label a thin pair as provisional rather than showing a rating that means nothing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A pair has its own page at a stable URL that does not depend on the order of the two names
- [ ] #2 It shows the pair's Doubles rank and rating, or says provisional when they have played too few games
- [ ] #3 It shows played, won, lost, win rate and point differential
- [ ] #4 It charts the pair's rating over the game days they played together
- [ ] #5 It lists the opponents they beat and lost to most
- [ ] #6 It lists their matches together, newest first, with scores
- [ ] #7 Reachable from the Doubles leaderboard and from the Partners list on a player's profile
- [ ] #8 A pair that has never played together is handled, not a blank page
<!-- AC:END -->
