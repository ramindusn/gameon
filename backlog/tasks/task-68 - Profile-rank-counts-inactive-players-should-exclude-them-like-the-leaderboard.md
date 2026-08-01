---
id: TASK-68
title: >-
  Profile rank counts inactive players (should exclude them, like the
  leaderboard)
status: Done
assignee: []
created_date: '2026-08-01 07:47'
updated_date: '2026-08-01 07:54'
labels:
  - bug
  - ranking
  - profile
dependencies: []
ordinal: 121000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The profile page's #rank chip comes from loadRatingHistory's rankOf, which ranks a player among ALL established players by rating — it does not exclude inactive players (missed the last ABSENCE_GRACE_PERIOD game days). The leaderboard (TASK-58) moved inactive players out of the ranked list, so the two diverge: the profile rank is inflated by any inactive players rated above the player, and inactive players themselves still get a rank number. Fix: exclude inactive players from the rank count, and give inactive players no rank (null) — matching the leaderboard. Confirmed on dev: e.g. two inactive established players (Tharindu, Samath) sit mid-table by rating, pushing every active player below them one/two ranks too low on their profile.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 loadRatingHistory computes the inactive set (missed the last ABSENCE_GRACE_PERIOD finished game days) and excludes those players from the rank count
- [x] #2 An inactive player's profile shows no rank chip (rank is null), even if established
- [x] #3 A player's profile rank now matches their position on the leaderboard's ranked (active, established) list
- [x] #4 Rank logic extracted to a pure, unit-tested computeRank(players, playerId, inactive) helper (excludes inactive from the count and returns null when the player is inactive or provisional)
- [x] #5 E2E rating-context path excludes E2E_INACTIVE too; typecheck, lint, tests pass
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Extracted a pure computeRank(players, playerId, inactive) helper (excludes inactive from the count; null when the player is inactive or provisional). loadRatingHistory now derives the inactive set from the last ABSENCE_GRACE_PERIOD finished sessions' attendance (reusing computeInactivePlayers) and passes it to rankOf; the E2E rating-context path excludes E2E_INACTIVE too. Added 6 computeRank unit tests. Verified on dev via localhost: Tharindu + Samath (established but inactive) now show NO rank chip, and Uditha dropped #11 → #9 (the two inactive players above her are no longer counted), matching the leaderboard. Full suite 264 pass, typecheck + lint + build clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Profile rank now excludes inactive players (and inactive players get no rank), matching the leaderboard. Fixed in a pure computeRank helper used by loadRatingHistory, which derives the inactive set from recent attendance. Verified: inactive players show no rank chip; active players' ranks dropped to their true active-only position.
<!-- SECTION:FINAL_SUMMARY:END -->
