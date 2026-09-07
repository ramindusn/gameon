---
id: TASK-99
title: Optional actual court numbers on a game day
status: In Progress
assignee:
  - '@ramindusn'
created_date: '2026-09-07 06:28'
updated_date: '2026-09-07 06:36'
labels:
  - feature
dependencies: []
ordinal: 165000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Courts are numbered positionally today: the draw writes court = index + 1 (apps/badminton/src/play/api.ts:158, GeneratePage.tsx:544), add-match writes court = i + 1 (PlayPage.tsx:462), and match_results has unique (session_id, round, court) treating it as a slot. So a game day always reads Court 1, Court 2, Court 3 — even when the club is actually playing on courts 5, 6 and 9 at the venue, which makes the schedule harder to follow on the night.

Let the matchmaker optionally give the real court numbers when generating a draw. Left empty, nothing changes: courts are numbered 1..N exactly as now. Filled in as a comma-separated list (e.g. '5, 6, 9'), those numbers are what every court label shows for that game day.

Approach agreed with the user: keep court as the positional slot (so slot identity, the unique constraint, next-free-court and add-match logic are all untouched) and store the real numbers as an optional per-session label list on match_sessions. Display maps slot -> label, falling back to the slot number when no list is set.

Set at draw time only (Generate page, beside the Courts count), for both casual draws and fixed-pairs tournaments. It applies to the whole game day, including rounds added later. Editing the numbers after a game day has started is deliberately out of scope here.

The three places that render a court label today: GeneratePage.tsx:399 (draw preview), PlayPage.tsx:1544 (score tab court card) and PlayPage.tsx:1891 (round builder court slots). The public read-only game-day page reuses PlayPage, so it is covered by the same change.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A 'Court numbers' input on the Generate page accepts an optional comma-separated list (e.g. '5, 6, 9'); left empty, the game day is numbered 1..N exactly as it is today
- [x] #2 When numbers are given, the draw preview, the score-tab court cards, and the round-builder court slots all show those numbers instead of 1..N
- [ ] #3 The numbers persist with the game day, so the live and public game-day pages show them on later visits
- [x] #4 The numbers apply to both casual draws and fixed-pairs tournaments
- [x] #5 A round added after the game day started uses the same court numbers
- [x] #6 Giving fewer numbers than courts, extra whitespace, or non-numeric junk is handled without breaking the draw (unlabelled courts fall back to their slot number)
- [x] #7 match_results.court keeps its positional 1..N meaning; the unique (session_id, round, court) constraint and add-match slot logic are unchanged
- [x] #8 Unit tests cover parsing the input and mapping slot -> label, including the empty/default case
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented as agreed: court stays the positional slot; the real numbers are a per-session label.

- packages/domain/src/matches/courts.ts (new): parseCourtNumbers() forgiving comma/space parse, drops junk/zero/negatives/fractions, dedupes keeping first; courtLabel(slot, list) returns list[slot-1] ?? slot. 9 unit tests.
- supabase/migrations/20260907090000_court_numbers.sql (new): match_sessions.court_numbers smallint[] nullable. Null = number by slot (every existing game day). match_results is untouched.
- packages/supabase/src/database.types.ts: added court_numbers to the match_sessions Row/Insert/Update blocks by hand, in the generator's alphabetical position (a later 'supabase gen types' run reproduces it).
- play/api.ts: MatchSession.courtNumbers, mapSessionRow reads court_numbers (empty array normalised to undefined), SESSION_COLS selects it, both createSessionFromPlan and createTournamentWithMatches take an optional courtNumbers and write null when absent. useMatchPlay threads it through both mutations.
- GeneratePage: optional 'Court numbers' field beside Courts with a live hint; parsed per keystroke; drives the draw preview labels and is passed to both the casual and tournament create calls.
- PlayPage: session.courtNumbers passed to CourtScore (score tab) and RoundBuilder (add-round slots); both label through courtLabel.

AC3 (persistence round-trip) is NOT checked: the migration has not been applied to any database yet, and this repo has no harness for functions that call the live Supabase client (same gap TASK-93 documented). It needs 'supabase db push' against dev, then a manual check that a game day created with numbers still shows them on reload.

DEPLOY ORDER: SESSION_COLS now selects court_numbers, so the migration must be applied BEFORE the frontend deploys — otherwise PostgREST rejects the select and the game-day page breaks. Apply to dev and prod per docs/RUNBOOK.md (supabase link --project-ref <ref> && supabase db push).

Validation: 479 unit tests pass (9 domain + 6 GeneratePage + 5 PlayPage new), tsc --noEmit clean, lint clean.
<!-- SECTION:NOTES:END -->
