---
id: TASK-50
title: 'Public tabbed live game-day page: schedule / points / score, cleaner cards'
status: To Do
assignee: []
created_date: '2026-07-17 10:56'
labels: []
dependencies: []
ordinal: 104000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rework the live game-day (Play) page. Make it public + read-only for players (matchmaker keeps editing). Remove the amber 'outstanding matches' summary box. Add a 3-tab layout: 1) Game schedule (read-only matchups + favoured odds), 2) Points table (game-day standings so far), 3) Score & finish (matchmaker-editable court cards; view-only for others). Tighten the bulky cards. Favourite rule: name a favourite for any non-exact split (only true 50/50 is 'Even'). After a match is scored, show the indicative per-match point swing on the card (underdog wins earn more; favourites holding earn less).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Play page is reachable publicly (logged-out) and read-only; only matchmakers see score inputs, finish, delete, line-up edit and add-custom-match
- [ ] #2 The amber outstanding-matches box is gone; Finish is still blocked while matches are unscored, with a compact inline hint
- [ ] #3 Three switchable tabs (Schedule, Points, Score); everyone sees all three, Score is view-only for non-matchmakers
- [ ] #4 Points tab shows the game-day standings (W-L and +/- point differential) ranked strongest first
- [ ] #5 Favoured meter names a favourite for any non-50/50 split; exactly even shows 'Even match'
- [ ] #6 A decided court shows the indicative per-match point swing (+/-), with an Upset marker when the underdog won
- [ ] #7 Existing PlayPage behaviour (scoring, line-up, custom match, finish, hide, delete) still works and is covered by tests
<!-- AC:END -->
