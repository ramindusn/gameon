---
id: TASK-5.3
title: Play UI + scoring
status: Done
assignee:
  - '@claude'
created_date: '2026-06-19 10:43'
updated_date: '2026-06-22 19:10'
labels:
  - 'size:M'
  - E04
dependencies:
  - TASK-1.5
parent_task_id: TASK-5
ordinal: 30000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Start a session from a generated plan; record winner per match; view history
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. GeneratePage: after a draw, add a 'Start session' button -> useCreateSession({clubId, plan, mode}) -> navigate to /play/:id.
2. PlayPage (/play/:id): useSession + useRoster (id->nickname); group results by round; each court shows team A / team B as tappable buttons that record the winner (useSetResult), winning side highlighted; a 'Finish session' / reopen toggle (useSetSessionStatus).
3. SessionsPage (/play): useSessions history list (date, mode, rounds, status) linking to each session.
4. Wire /play + /play/:id routes (matchmaker) + 'Play' nav.
5. RTL tests mocking the hooks: render a session, record a winner, list history.
6. lint + build + unit green. (E2E play bypass deferred to 5.4.)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added the Play UI: GeneratePage now shows a 'Start session' button on a draw -> useCreateSession -> navigates to /play/:id. PlayPage (/play/:id) loads the session + roster, groups results by round, and renders each court with the two teams as tappable buttons that record the winning side (useSetResult, winner highlighted), plus a Finish/Reopen toggle (useSetSessionStatus). SessionsPage (/play) lists session history (date, mode, rounds, status) linking to each. Wired /play + /play/:id routes (matchmaker) and a 'Play' nav item. RTL tests: PlayPage (render names + winner, record a winner, finish), SessionsPage (history links), and updated GeneratePage test to mock useMatchPlay. 60 unit + 28 e2e pass, lint + build clean. (E2E play bypass deferred to TASK-5.4.)
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Play UI + scoring: start a session from a generated draw, tap the winning team per court to record results, finish/reopen the session, and browse session history. Routes/nav wired for matchmakers; covered by RTL tests. Verified with 60 unit + 28 e2e, lint, build.
<!-- SECTION:FINAL_SUMMARY:END -->
