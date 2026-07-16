---
id: TASK-44
title: Results-aware effective skill for matchmaking (manual skill kept as seed)
status: Done
assignee: []
created_date: '2026-07-16 21:28'
updated_date: '2026-07-16 21:28'
labels:
  - feature
  - ranking
dependencies: []
ordinal: 98000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Manual 1-10 skill is kept as the reference/seed and never overwritten. Matchmaking now uses an effective skill = blend(manual, results-based skill from Glicko rating) weighted by games (w=min(1,games/8)); skillFromRating = clamp(5.5+(rating-1500)/15, 1, 10). Computed on read (no migration). Profile shows base -> now. Documented in ADR 0013.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Match generator balances by effective skill (manual seed blended with rating by games)
- [x] #2 Manual skill column is never overwritten; profile shows base -> now
- [x] #3 ADR 0013 documents the results-aware skill + how ranking works end to end
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added effectiveSkill (manual seed blended with rating-derived skill, w=games/8, slope /15); generator balances by it, profile shows base->now. Manual skill untouched, computed on read. ADR 0013 documents it. Verified in dev.
<!-- SECTION:FINAL_SUMMARY:END -->
