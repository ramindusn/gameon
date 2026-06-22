---
id: TASK-10.2
title: 'Create game day from a reviewed draw (editable date/time, edit/delete)'
status: Done
assignee:
  - '@me'
created_date: '2026-06-22 20:39'
updated_date: '2026-06-22 20:52'
labels:
  - E09
  - 'size:M'
dependencies:
  - TASK-10.1
parent_task_id: TASK-10
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make persisting a game day an explicit, reviewable step and let the matchmaker manage it. On GeneratePage, generating a draw stays a client-side preview; after reviewing it the matchmaker presses 'Create game day' to persist the session + match rows, choosing a date/time that defaults to the current date/time. The matchmaker can edit an existing game day's date/time and delete a game day (with a confirm) if something is wrong. Surface the game-day date/time in the sessions list and the play view. Rename the user-facing copy from 'session' to 'game day' across generate/play/sessions screens.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Generating a draw is a client-only preview; the game day persists only when the matchmaker confirms 'Create game day'
- [x] #2 Before creating, the matchmaker can set/adjust the game day's date and time (defaults to current date/time)
- [x] #3 The matchmaker can edit the date/time of an existing game day
- [x] #4 The matchmaker can delete a game day (with confirm); it leaves the list and does not contribute to ranking
- [x] #5 Game-day date/time is shown in the sessions list and the play view; user-facing copy says 'game day'
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Made persisting a game day an explicit, reviewable step with an editable date/time, plus edit/delete management.

Data layer (apps/badminton/src/play):
- MatchSession gains playedAt; mapSessionRow + SESSION_COLS include played_at; listSessions orders by played_at desc.
- createSessionFromPlan now takes playedAt and writes it on insert (and into the e2e store).
- New updateSessionPlayedAt(id, playedAt) and deleteSession(id, wasFinished). deleteSession relies on ON DELETE CASCADE for results and, if the game day was already finished (so it had contributed to the boards), best-effort re-invokes recompute-ratings to drop its contribution.
- e2eStore: e2eList sorts by playedAt; added e2eSetPlayedAt + e2eDelete (removes the session and its results).
- New hooks useUpdateSessionPlayedAt + useDeleteSession; useCreateSession passes playedAt.
- New play/datetime.ts helpers (isoToLocalInput / localInputToIso / nowLocalInput / formatPlayedAt) bridging an ISO timestamp and a native datetime-local input.

UI:
- GeneratePage: generation stays a client-only preview; the review panel adds a 'Game day date & time' datetime-local input (defaults to now) and the button is now 'Create game day' (testid create-game-day), which persists session+results with the chosen ISO time.
- PlayPage: shows the game-day date with an inline edit (edit-datetime -> datetime-local -> save) and a two-step Delete (delete-game-day -> confirm-delete-game-day) that returns to /play. 'Finish session' -> 'Finish game day'; header title 'Game day · ...'.
- SessionsPage: title 'Game days', copy updated to 'game day', rows show playedAt (formatPlayedAt).

Validation: build clean, lint clean, 95 unit tests pass (updated SessionsPage/PlayPage tests for playedAt + the two new mocked hooks; added a PlayPage delete-confirm test), 40 e2e pass (renamed start-session->create-game-day in the existing flow; added an e2e that sets a date pre-create, edits it on the play view, then deletes the game day).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Generating a draw is now an explicit preview; the matchmaker reviews it and presses 'Create game day' (with an editable date/time defaulting to now) to persist it. Added an editable match_sessions.playedAt end-to-end, plus edit-date and two-step delete on the play view (deleting a finished game day re-runs the recompute so it stops counting). Sessions list and play view show the game-day date and user-facing copy now says 'game day'. Verified: build/lint clean, 95 unit + 40 e2e pass.
<!-- SECTION:FINAL_SUMMARY:END -->
