---
id: TASK-9.3
title: Public player profile + match history
status: Done
assignee: []
created_date: '2026-06-21 19:42'
updated_date: '2026-06-22 21:37'
labels:
  - 'size:M'
  - E08
dependencies: []
parent_task_id: TASK-9
ordinal: 48000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tap a player -> public profile: individual performance + match history; no login
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Public PlayerProfilePage shows real performance (Glicko rating via usePlayerBoard, W/L record + games from history, recent form via FormStrip) and full match history (partner/opponents resolved via usePlayerNames, scores, W/L pills). Added loadPlayerHistory(playerId) in play/api.ts — two public-read queries: match_results filtered by player (.or across team slots, winner not null), then match_sessions for date/mode. 3 unit tests in PlayerProfilePage.test.tsx. No login required.
<!-- SECTION:NOTES:END -->
