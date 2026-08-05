---
id: TASK-35
title: >-
  Per-brand shuttle usage on a game day: matchmaker records used count before
  finishing; admin sees per-brand + total expense
status: To Do
assignee: []
created_date: '2026-07-09 07:07'
updated_date: '2026-08-04 12:04'
labels:
  - feature
  - inventory
  - fund
  - play
  - admin
dependencies:
  - TASK-34
priority: medium
ordinal: 89000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Support two shuttle brands being used on a single game day and report expenses per brand plus the total. Two connected parts: (1) MATCHMAKER — before finishing a game day, let the matchmaker enter the number of shuttles used, per brand, for that day. (2) ADMIN — once the matchmaker updates the used counts and finishes the game day, the admin view shows the shuttle expense broken down separately per brand AND the combined total for that game day. Grounding: the fund domain already has recordUsage(state, date, [{productId, shuttlesUsed}]) and costPerShuttle/avgBarrelPrice for valuing usage (packages/domain/src/fund). Usage is currently keyed by date; this should tie a game day's recorded usage into that model so stock is deducted and the per-brand cost is derivable. Coordinate with TASK-34 (barrel/loose display) and TASK-30-era finish-gating in the play flow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Matchmaker can record shuttles used per brand for a game day before finishing it (editable until finished)
- [ ] #2 Finishing the game day commits the usage, deducting stock via the existing fund usage model
- [ ] #3 Admin view shows, for a game day, the shuttle expense per brand and the combined total
- [ ] #4 Supports two (or more) brands used on the same game day
- [ ] #5 Per-brand cost uses the product's average cost-per-shuttle (costPerShuttle) consistent with existing fund math
- [ ] #6 Admin only sees the finalized figures after the matchmaker has updated counts and finished the day
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Depends conceptually on TASK-34 for the inventory display and reuses recordUsage/costPerShuttle. May warrant splitting into a matchmaker-entry subtask and an admin-reporting subtask during planning.

SUPERSEDED by the TASK-69 usage subtask (2026-08-04): shuttle usage now deducts from a specific matchmaker's held stock rather than a club-wide pool, with a deduct-from picker defaulting to the signed-in matchmaker. The per-brand expense reporting requirement carries over into that task.
<!-- SECTION:NOTES:END -->
