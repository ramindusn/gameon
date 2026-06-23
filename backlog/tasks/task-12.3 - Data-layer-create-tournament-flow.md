---
id: TASK-12.3
title: Data layer + create-tournament flow
status: Done
assignee: []
created_date: '2026-06-23 12:37'
updated_date: '2026-06-23 12:53'
labels:
  - E11
dependencies: []
parent_task_id: TASK-12
ordinal: 65000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 createTournament makes an empty kind=tournament session; loadFixedPairStandings + hook; matchmaker can start a tournament and build pair-vs-pair matches via the existing custom-match flow
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
play/api: SessionKind + kind on MatchSession/mapSessionRow/SESSION_COLS; createTournament(clubId, playedAt) makes an empty kind=tournament session. ranking/api: loadFixedPairStandings() (public read) + E2E seed. useFixedPairStandings + useCreateTournament hooks. 'New tournament' button on MatchmakerHome navigates to /play/:id to build fixtures via the existing custom-match flow. Hand-added kind to packages/supabase generated types.
<!-- SECTION:NOTES:END -->
