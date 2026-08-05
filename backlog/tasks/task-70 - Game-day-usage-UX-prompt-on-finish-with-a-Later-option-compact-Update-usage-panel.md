---
id: TASK-70
title: >-
  Game-day usage UX: prompt on finish with a Later option, compact Update usage
  panel
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-08-05 03:23'
updated_date: '2026-08-05 04:07'
labels:
  - feature
  - inventory
  - play
  - ui
dependencies: []
priority: medium
ordinal: 131000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Simplify how a matchmaker records shuttles used. Today the game day page carries a permanently-open usage form (GameDayUsage card), and Finish game day navigates straight to the leaderboard — so usage is easy to forget and the form clutters the page. Instead: (1) clicking Finish game day opens a POPUP asking for the shuttles used; (2) the popup has a 'Later' button so the matchmaker can skip it and still finish; (3) the game day page represents usage compactly — a summary of what is recorded plus an 'Update usage' button that re-opens the same popup, available whether the day is live or finished. Revamp the page representation as needed. Completes the outstanding UX half of TASK-69.8 AC#6 (usage recordable before finishing and added afterwards). Non-matchmakers (no held stock) must never see the popup — finishing behaves as before for them.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Clicking Finish game day opens the shuttle-usage popup instead of navigating straight away
- [x] #2 The popup has a Later button that dismisses it without recording, and the game day still finishes
- [x] #3 Recording usage from the popup saves and closes it
- [x] #4 The game day page shows a compact usage summary (what is recorded, or that nothing is) with an Update usage button that re-opens the popup
- [x] #5 The Update usage entry point works while the day is live and after it is finished
- [x] #6 Someone with no held stock never sees the popup; finishing navigates as before
- [x] #7 Existing GameDayUsage form behaviour (holder defaulting, override, validation) still passes its tests
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Refactored apps/badminton/src/fund/GameDayUsage.tsx into three parts sharing one form: GameDayUsage (the form + 'Already recorded' list, now chrome-less so it can sit in a dialog, with optional onSaved + secondary-button slot), GameDayUsageModal (Modal wrapper adding the 'Later' button; closes itself on save), and GameDayUsagePanel (compact Card: per brand+holder summary of what is recorded, or 'No shuttles recorded for this game day yet', with a Record/Update usage button). Exported useStockContext so PlayPage can tell whether the signed-in person holds stock. PlayPage: replaced the always-open usage card with the panel; finish now does setStatus('finished') then opens the popup when canRecordUsage, else navigates to /leaderboard as before; closing a finish-opened popup (via Later or after saving) continues to /leaderboard, while the panel-opened popup just closes. Tests: existing 9 form tests pass untouched; +8 new (modal open/closed, Later records nothing, closes on save, panel empty/summary-sums-per-brand-holder/opens/hidden-for-non-holder) and +2 PlayPage tests (prompts instead of navigating; navigates straight through for a non-holder). Full verify green: lint, typecheck, 342 unit, 40 e2e.

Revised after review of the first cut (screenshot): the per-brand 'From whose stock' selects were too many options and offered brands nobody held ('Nobody is holding this'). Reworked the dialog to holder-first — a single 'From whose stock' select at the top (defaults to the signed-in matchmaker when they hold any stock, otherwise nothing preselected), listing only people who actually hold something; then only that person's brands, each showing what they have left as 'N barrels + N loose = N shuttles' (holderStock from the domain) with one Used input. Dropped the input's max attribute: native constraint validation silently blocked submit, hiding the API's clearer 'X does not have N Y shuttles' refusal. Trade-off: one submission now records against one holder — mixing holders means recording twice. Also fixed the deferral dead end: 'Later' now stays on the game day page (new onLater prop) so the usage panel is right there, instead of navigating to the leaderboard; recording still moves on. Tests updated for the new shape (20 in GameDayUsage, 27 in PlayPage incl. Later-stays-put). Verify green: lint, typecheck, 346 unit, 40 e2e.

Final tweak: the usage panel is no longer on the page during live play — the finish popup is the prompt. It appears once the day is finished, or once deferred with Later (new usageDeferred flag, so it survives a reopen). Tests cover hidden-while-live, shown-when-finished, and revealed-after-Later.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Finishing a game day now opens a shuttle-usage popup instead of jumping to the leaderboard, with a Later button that defers without recording and keeps the matchmaker on the page. The dialog is holder-first: one 'From whose stock' select (defaulting to the signed-in matchmaker when they hold stock, nobody otherwise, listing only people actually holding something), then only that person's brands with what they have left as barrels + loose + total. The game day page carries a compact usage panel — a per brand+holder summary or 'nothing recorded yet' plus a Record/Update usage button — shown once the day is finished or was deferred. Non-holders never see any of it and finish as before. Verified: lint, typecheck, 348 unit, 40 e2e.
<!-- SECTION:FINAL_SUMMARY:END -->
