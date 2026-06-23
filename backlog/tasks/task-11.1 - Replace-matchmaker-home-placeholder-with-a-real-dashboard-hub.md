---
id: TASK-11.1
title: Replace matchmaker home placeholder with a real dashboard hub
status: Done
assignee:
  - '@opencode'
created_date: '2026-06-23 06:03'
updated_date: '2026-06-23 06:07'
labels: []
dependencies: []
parent_task_id: TASK-11
ordinal: 61000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a matchmaker signs in they land on /matchmaker, which is a stale placeholder card ('tools arrive in the next epics') even though Generate/Play/Players all shipped. Replace it with a useful dashboard: resume live game days, quick actions to start a new draw / manage players, a roster-attendance snapshot, and a short list of recent game days.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Live game days (status=live) are listed with a Resume link to /play/:id; shown first
- [x] #2 When no live game day exists, a clear empty state CTA points to Generate a draw
- [x] #3 Quick actions link to /generate (new draw) and /players (manage roster)
- [x] #4 A roster snapshot shows present vs total players from the roster
- [x] #5 A short Recent game days list links to /play/:id with a View all link to /play
- [x] #6 Loading and error states are handled for the sessions/roster queries
- [x] #7 No placeholder/'coming in next epics' copy remains
- [x] #8 Unit tests cover the live-resume list, empty state, and roster snapshot
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Rewrite MatchmakerHome.tsx into a dashboard using useSessions (live-resume + recent), useRoster (present/total). 
2. Sections: Quick actions (Generate/Players), Live now (resume live game days or empty CTA), Roster snapshot (present/total), Recent game days (latest finished, View all -> /play).
3. Reuse AppShell, Card, Button, datetime.formatPlayedAt; player-name links not needed here.
4. Rewrite MatchmakerHome.test.tsx: live-resume list, empty state, roster snapshot. Mock useSessions/useRoster.
5. Run lint, build, unit; add/adjust e2e if a matchmaker-home spec exists.
6. Finalize: check ACs, append notes, final summary; commit on feat/matchmaker-ux.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Rewrote MatchmakerHome.tsx as a dashboard: QuickActions (Generate/Players via styled LinkButton since UI Button is a plain <button>), LiveNow (live sessions with Resume -> /play/:id, empty-state CTA to /generate), RosterSnapshot (present/absent/total from useRoster), RecentGameDays (latest 5 finished -> /play/:id, View all -> /play). Loading/error handled per query. Kept data-testid='matchmaker-home' (login.test.tsx relies on it). Added MatchmakerHome.test.tsx (4 cases: quick actions, live-resume before finished, empty-state CTA, roster snapshot). Verified: lint clean, build OK, 155 unit pass, 21 e2e (chromium) pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced the stale /matchmaker placeholder with a real dashboard hub: resume live game days, quick actions to start a draw or manage players, a present/absent/total roster snapshot, and recent game days. Verified with lint, build, 155 unit tests (incl. 4 new) and 21 chromium e2e.
<!-- SECTION:FINAL_SUMMARY:END -->
