---
id: TASK-26
title: Investigate add-match flow for an ongoing game session
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-27 23:55'
updated_date: '2026-06-27 23:57'
labels: []
dependencies: []
priority: medium
ordinal: 80000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate the 'Add custom match' flow on the live Play page (apps/badminton/src/routes/PlayPage.tsx — AddCustomMatch / useAddCustomMatch -> addCustomMatch in play/api.ts) for an in-progress game day. Review how a new match is added mid-session: which players can be picked (currently the full present roster vs the game day's players — cf. TASK-24 which limited line-up edits to session players), how round/court are assigned (nextSlot), validation (duplicate players, min 4), what happens after scoring/finishing, and whether it interacts correctly with finish-gating and rating recompute. Identify bugs, UX gaps, and inconsistencies, and propose concrete fixes/follow-up tasks. Investigation only — no implementation until findings are reviewed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Document the current end-to-end add-match flow (UI -> hook -> api -> DB) with file/line references
- [ ] #2 List concrete issues found (player eligibility, round/court assignment, validation, finish-gating, recompute) with severity
- [ ] #3 Recommend whether add-match should be limited to the game day's players (consistency with TASK-24) or keep full roster, with rationale
- [ ] #4 Propose prioritized follow-up tasks for any fixes (no code changes in this task)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Investigation: add-match flow (live game day)

### Flow (UI -> hook -> api -> DB)
- UI: AddCustomMatch (PlayPage.tsx:563) — toggle opens a 4-slot form (a1,a2,b1,b2) of PlayerSelect dropdowns; `add()` runs validateLineup then onAdd(slots).
- Eligibility source: PlayPage passes `present={present}` (PlayPage.tsx:292) = ALL active roster players (PlayPage.tsx:56), NOT the game day's players.
- Slot assignment: nextSlot(data.results) (PlayPage.tsx:708) -> round = max(existing rounds); court = max(court in that round)+1.
- Hook: useAddCustomMatch (useMatchPlay.ts) -> addCustomMatch(clubId, sessionId, round, court, players).
- API: addCustomMatch (play/api.ts) inserts a match_results row (team_a1/a2/b1/b2); no server-side content validation.
- Validation: validateLineup (packages/domain/src/matches/lineup.ts) — only checks 4 non-empty + all 4 distinct WITHIN this match.
- Finish-gating: outstanding = results with winner===null (PlayPage.tsx:82); a new custom match has winner=null so it correctly blocks Finish until scored/deleted. ✓ (correct)

### Issues found (severity)
1. [MEDIUM] No same-round double-booking check. validateLineup only dedupes the 4 slots; a player already playing another court in the SAME round can be added again -> one person on two courts simultaneously. Neither client nor DB prevents it.
2. [MEDIUM] Eligibility = full active roster, not the game day's players — inconsistent with TASK-24 (line-up edits limited to session players). You can add someone who isn't at the venue. (Counter-case: a legit late arrival not in the original draw.)
3. [LOW-MED] Court-number race / no DB uniqueness. nextSlot is computed client-side from possibly-stale data.results; two quick adds (before refetch) can collide on (session, round, court). No unique index on (session_id, round, court).
4. [LOW] Round is always the last round. nextSlot can only append to max(round); no way to add a match to an earlier round.
5. [LOW] Mixed mode not enforced. A 'mixed' session's custom match isn't required to be male+female (arguably intended as a manual override).
6. [LOW] Validation is client-only; addCustomMatch does no server-side dedupe/eligibility check (RLS gates who, not content).

### Recommendation on eligibility (AC#3)
Keep the full ACTIVE roster for add-match (NOT just session players): a custom match is the one legitimate place to bring in a late arrival who wasn't in the original draw. BUT fix issue #1 by excluding players already booked in the target round, so the picker can't double-book. This resolves the real bug while preserving the late-arrival use case — and is a deliberate, documented divergence from TASK-24 (which is about swapping within a fixed match).

### Proposed follow-ups (need approval before creating)
- A [MEDIUM]: Prevent same-round double-booking — filter add-match dropdowns to exclude players already in that round; validate on save. (+ unit test)
- B [LOW-MED]: Add DB unique index on match_results(session_id, round, court) and/or compute the slot server-side to remove the race.
- C [LOW]: Let the matchmaker choose the target round (not just the last) when adding a custom match.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Investigated the live add-match flow end-to-end. Key finding: validateLineup only dedupes within the 4 slots, so a player already playing another court in the same round can be double-booked (MEDIUM). Eligibility uses the full active roster (intentional for late arrivals, but inconsistent with TASK-24). Also a court-number race (no unique index) and last-round-only slotting. Recommend keeping full roster but excluding already-booked players in the target round; 3 prioritized follow-ups proposed (A/B/C) pending approval.
<!-- SECTION:FINAL_SUMMARY:END -->
