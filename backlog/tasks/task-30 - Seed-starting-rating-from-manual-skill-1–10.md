---
id: TASK-30
title: Seed starting rating from manual skill (1–10)
status: To Do
assignee: []
created_date: '2026-06-28 09:41'
labels:
  - ranking
dependencies: []
priority: low
ordinal: 84000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Today every player starts Glicko-2 ranking at a flat DEFAULT_RATING (1500) regardless of their manual skill (1–10). Skill is currently used only by the match generator, never by ranking (packages/domain/src/ranking has zero skill references). This means a known strong newcomer and a known weak newcomer both debut at 1500 and only diverge after several game days, so early leaderboards mis-rank fresh players. Enhancement: let the manual skill value seed the *initial* rating (and optionally a lower starting RD for higher-skill seeds), so newcomers begin nearer their true level while real results still take over as games accumulate. Must stay deterministic and not disturb players who already have match history. See docs/ranking.md and docs/adr/0011-ranking-glicko2.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A player's first-ever rating period seeds the starting rating from their skill (1–10) instead of a flat 1500, via a documented monotonic mapping
- [ ] #2 Players with existing match history are unaffected — seeding applies only before a player's first played period
- [ ] #3 The mapping is pure/deterministic and unit-tested against representative skill values (e.g. 1, 5, 10)
- [ ] #4 Changing a player's skill after they have played does not retroactively move their rating
- [ ] #5 docs/ranking.md and ADR 0011 are updated to describe skill-seeded starting ratings
<!-- AC:END -->
