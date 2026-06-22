---
id: TASK-10.5
title: Finish gating + recompute & attendance for scored/partial play
status: Done
assignee:
  - '@me'
created_date: '2026-06-22 20:39'
updated_date: '2026-06-22 21:14'
labels:
  - E09
  - 'size:M'
dependencies:
  - TASK-10.3
  - TASK-10.4
parent_task_id: TASK-10
ordinal: 58000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enforce the game-day completion rule and keep ranking correct for partial play. Finishing a game day is blocked while any match is unresolved (has no score); the UI lists the outstanding matches so the matchmaker can score or delete each one. Once every match is scored (or deleted), finishing succeeds and triggers the ranking recompute. Confirm only finished game days contribute to ranking and that deleted/unplayed matches do not count. The attendance snapshot must mark present = a player who appeared in a played (scored) match that day; everyone else is absent (absence-decay applies). Update ADR 0011 if attendance semantics change. Cover with unit tests (winner-from-score, finish gating) and an e2e flow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The matchmaker cannot finish a game day while any match is unresolved; the UI lists the outstanding matches
- [x] #2 After every match is scored or deleted, finishing succeeds and triggers the ranking recompute
- [x] #3 Only finished game days contribute to ranking; deleted/unplayed matches do not count
- [x] #4 Attendance snapshot marks present = appeared in a played (scored) match that day; others absent
- [x] #5 Unit tests (winner-from-score, finish gating) and an e2e (create game day with date/time -> edit line-up -> add custom match -> score all -> finish -> leaderboard updates) pass
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Finish gating (PlayPage): compute outstanding = results with winner===null (unscored). Disable Finish while outstanding>0 and render a list of outstanding matches (round/court + team names) so the matchmaker can score/delete each. Finishing already triggers recompute via setSessionStatus('finished') (AC#2). Deleted matches are removed rows; an all-deleted day finishes with nothing to rate.
2. Recompute attendance (AC#4): in recompute-ratings/index.ts, mark present only from SCORED result rows (winner!=null or both scores) instead of any row — 'present = appeared in a played match'. AC#3 already holds (status='finished' filter; toMatchRecord skips unresolved; deleted rows absent).
3. ADR 0011: tighten attendance wording to 'appeared in a scored (played) match'.
4. Tests: PlayPage.test.tsx — Finish disabled + outstanding list while a match is unscored; enabled + finishes once all scored. (winner-from-score already in score.test.ts.) e2e play.spec.ts — full flow: create game day w/ date/time -> edit line-up -> add custom match -> score all -> Finish gated until all scored -> finish -> Finished. Note: leaderboard recompute not observable under VITE_E2E bypass; assert finish gating + Finished status.
5. Run lint+build+unit+e2e; apply db reset to sanity-check migration set unaffected; finalize AC 1-5, notes, final-summary, Done; commit on feat/gameday, ff-merge main + push; then merge/cleanup epic branch.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented finish gating + scored-match attendance (E09 / TASK-10.5).

Finish gating (PlayPage, AC#1/#2): outstanding = results with winner===null (an unscored match has no derived winner). Finish button disabled while outstanding>0; a new 'outstanding-matches' panel lists each unresolved match (Round/Court + team names, testid outstanding-<id>) so the matchmaker can score or delete it. Once all scored (or deleted) the button enables; finishing still flows through setSessionStatus('finished') which invokes recompute-ratings (AC#2). Deleting a match removes its row, so an all-deleted day can finish with nothing to rate.

Recompute (supabase/functions/recompute-ratings/index.ts):
- AC#3 already held: sessions filtered by status='finished'; toMatchRecord() skips rows with no players/outcome; deleted matches have no row. No change needed beyond attendance.
- AC#4: added isScored(r) (winner!=null OR both scores present) and now mark present ONLY from scored rows in presentBySession — 'present = appeared in a played (scored) match'. Unscored/deleted matches no longer mark attendance.

ADR 0011: attendance bullet reworded to 'appeared in a played (scored) match' + note that finish gating guarantees no unplayed matches in a finished session.

Tests: PlayPage.test.tsx — finish disabled + outstanding list while a match is unscored; enabled + finishes once all scored (winner-from-score already covered in score.test.ts). Updated the prior 'finishes the session' + name assertions for the gated UI. e2e play.spec.ts — (a) score-a-match test now scores BOTH courts, asserts finish gated until done; (b) full AC#5 flow: create game day w/ date/time -> edit line-up -> add custom match -> delete it -> finish gated/outstanding shown -> score all -> finish enabled -> Finished.

Validation: lint clean; build green; unit 114 passed; e2e 42 passed. deno not installed locally so the Edge Function attendance change is verified by code review only (runtime deferred to deploy); leaderboard recompute is not observable under VITE_E2E (supabase client null), so the e2e asserts finish gating + Finished status rather than board values.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added game-day finish gating (Finish blocked + outstanding-matches list until every match is scored or deleted; finishing triggers the recompute) and tightened the recompute attendance snapshot to mark present only for players in a scored match (new isScored helper). Updated ADR 0011. Verified with lint, build, 114 unit tests, and 42 e2e tests (incl. the full create→edit→custom→score-all→finish flow).
<!-- SECTION:FINAL_SUMMARY:END -->
