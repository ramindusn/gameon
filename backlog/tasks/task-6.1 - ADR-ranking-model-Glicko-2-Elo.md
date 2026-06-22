---
id: TASK-6.1
title: ADR + ranking model (Glicko-2 / Elo)
status: Done
assignee:
  - '@claude'
created_date: '2026-06-19 10:43'
updated_date: '2026-06-22 19:24'
labels:
  - 'size:M'
  - E05
dependencies: []
parent_task_id: TASK-6
ordinal: 32000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ADR chooses rating system + how individual rating is derived from doubles
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Write docs/adr/0011-ranking-glicko2.md:
- Decision: Glicko-2 for BOTH boards.
- Individual board: team strength = avg of the pair's ratings; each of the 4 players updated vs the opposing team-average, weighted by point-score margin (margin-of-victory multiplier).
- Doubles board: per-pair Glicko-2 ratings (each unique partnership rated vs opposing pair).
- Consequence: match_results must also store per-match point scores (team_a_score/team_b_score) — schema addition owned by E05 (TASK-6.2/6.3); winner alone is insufficient for margin.
- Recompute: deterministic batch over locked/submitted game days (rating periods), pure calc in packages/domain.
Update docs/adr/README.md index. Finalize + commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Wrote docs/adr/0011-ranking-glicko2.md (indexed in docs/adr/README.md). Decision: Glicko-2 for BOTH boards. Individual board rates each player; the opposing doubles team is collapsed to a synthetic opponent (rating = mean of the two opponents, RD = RMS of their RDs), and the outcome is applied to all four players. Doubles board rates each unordered partnership as its own Glicko-2 entity (pair-vs-pair). Outcome score uses point margin: s = points_for / total_points (in [0,1]), so blowouts move ratings more than close games. One locked game day = one rating period; recompute is a deterministic full replay of locked days via a pure packages/domain function (driven by a trigger/Edge Function in 6.3). Key consequence flagged: match_results must add team_a_score/team_b_score (winner-only is insufficient for margin) — owned by 6.2/6.3, with win/loss s in {0,1} as the degenerate fallback. Provisional (high-RD) handling deferred to leaderboard UI (6.4). Docs-only change; no code/tests.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
ADR 0011 locks the ranking model: Glicko-2 for individual + per-pair boards, team collapsed to a synthetic average opponent, and point-margin outcome scores; locked game days are rating periods recomputed by a pure deterministic replay. Notes the required per-match score schema addition for downstream tasks.
<!-- SECTION:FINAL_SUMMARY:END -->
