---
id: TASK-65
title: 'Profile: partner & opponent insights + readable long match history'
status: Done
assignee: []
created_date: '2026-07-27 21:48'
updated_date: '2026-07-28 23:21'
labels:
  - feature
  - frontend
  - profile
dependencies: []
ordinal: 118000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the public player profile's match history. (1) Add a 'Partners & rivals' insights card built purely from the player's match history: most-played partners (name, your record together, win%) and toughest opponents (opponents you beat least often, min games threshold, showing your record vs them); names link to their profiles. (2) Make long histories readable: the grouped-by-game-day list currently renders every game day, which gets very long for active players — collapse to the most recent few with a 'Show all N game days' toggle. Pure head-to-head aggregation lives in a testable module.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 New pure computePartnerStats + computeOpponentStats (+ a toughestOpponents helper) aggregate games/wins per partner and per opponent from PlayerMatch[]
- [x] #2 Profile shows a 'Partners & rivals' card: most-played partners and toughest opponents, each with the player's record and win%, names linking to /players/:id
- [x] #3 Insights are hidden when there aren't enough matches to be meaningful
- [x] #4 Match history collapses to the most recent N game days with a 'Show all N game days' toggle when there are more; expands/collapses without losing the grouped layout
- [x] #5 Unit tests cover the aggregation + sort (most-played partner, toughest opponent by win-rate with a min-games floor, null partner/opponent slots ignored)
- [x] #6 Typecheck, lint, and tests pass
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added pure headToHead module (computePartnerStats, computeOpponentStats, toughestOpponents) with 6 unit tests. Profile now shows a 'Partners & rivals' card: most-played partners (record together + win%) and toughest opponents (lowest win-rate vs, min 2 games, your record), names linking to /players/:id; hidden until history.length>=4. Match history collapses to the most recent HISTORY_PREVIEW_DAYS (5) game days with a 'Show all N game days' toggle. Verified visually against a real 89-match player on localhost (dev DB) — insights compute correctly (e.g. Sahan 8-20 partner, Nilusha 3-18 toughest), history collapsed to 5 with 'Show all 8 game days', no console errors. Comprehensive typecheck, lint, full unit suite (bar the pre-existing PlayerProfilePage timezone failure), and build all pass. Did not enlarge the shared PlayerProfilePage.test fixture (only 2 matches → insights hidden there); the pure functions carry the coverage.

Simplified the insights display per feedback: the win% column was unclear (and '21–13' could be misread as a game score). Replaced it with an explicit W–L record ('8W – 20L'), matching the Performance card's 'record' style — wins emphasised, losses muted, no percentage. Column headers ('RECORD TOGETHER' / 'YOUR RECORD VS THEM') carry the meaning; ordering still conveys most-played / toughest. Verified at mobile width.

Per feedback, show the record as an explicit win rate + loss rate ('29% won · 71% lost') instead of the W–L count — win emphasised, loss muted, hover shows the raw counts. Verified at mobile width.

Added the match count to each insight row: '28 games · 29% won · 71% lost' (singular 'game' at 1). Makes the most-played / toughest ordering self-evident. Verified one-line fit at both mobile (420) and desktop 2-col (900) widths.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a 'Partners & rivals' insights card to the profile (most-played partners + toughest opponents, with records, win%, and profile links) and made long match histories readable by collapsing to the most recent 5 game days behind a 'Show all N' toggle. Pure head-to-head aggregation is unit-tested; integration verified on a real 89-match profile.
<!-- SECTION:FINAL_SUMMARY:END -->
