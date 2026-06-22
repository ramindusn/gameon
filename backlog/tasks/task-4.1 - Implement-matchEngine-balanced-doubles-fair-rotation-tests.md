---
id: TASK-4.1
title: Implement matchEngine (balanced doubles + fair rotation) + tests
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-19 10:42'
updated_date: '2026-06-22 18:28'
labels:
  - 'size:M'
  - E03
dependencies: []
parent_task_id: TASK-4
priority: high
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Pure function, no backend; re-derived from scratch.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 generateRounds(players, n) balances team skill, avoids partner/opponent repeats, rotates sitting
- [x] #2 Unit tests incl. a deterministic balance case; play-or-sit invariant holds
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Ported BadmintonApp's src/lib/matchEngine.js (+ utils shuffle/pairKey/matchKey) into packages/domain/src/matches as pure TS: generateRounds(players, numRounds, opts). Open mode = faithful skill-balanced port (top2/bot2 guards, partner/opponent-repeat avoidance, relaxation 0..4, 1-3 court search + fallback, fair sitting rotation, court tiering on odd rounds). NEW mixed mode: male+female pairs (2M+2F courts), rotates sitting, reports unplaceable (other/unset gender). Determinism via injectable rng (seeded PRNG in tests). 8 unit tests: <4 -> null, play-or-sit invariant, deterministic-for-seed, court balance, sit rotation, mixed pairs all M+F, unplaceable reported, scarce-gender -> null. Pure/free/offline (no LLM, no network). 48 unit total green.
<!-- SECTION:NOTES:END -->
