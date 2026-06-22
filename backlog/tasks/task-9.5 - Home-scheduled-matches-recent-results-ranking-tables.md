---
id: TASK-9.5
title: 'Home: scheduled matches, recent results & ranking tables'
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-06-22 22:06'
updated_date: '2026-06-22 23:42'
labels:
  - E08
dependencies: []
parent_task_id: TASK-9
ordinal: 59000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Redesign the public home's match + ranking sections to match the GameOn mockup: a Scheduled Matches card grid (badge, court, game-day time, both sides with pair ratings), a Recent Results list (winner highlighted, scores, relative time), and Doubles + Individual ranking tables (rank, names, rating). Wire to real app data; hide match sections when empty (leaderboard-only); win % column dropped (not stored); doubles-only badge.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Scheduled Matches renders unscored courts from live game days as cards with a DOUBLES badge, court, game-day date/time, and each side's names + pair rating
- [x] #2 Recent Results lists recently scored courts newest-first with the winner highlighted, the score, and a relative timestamp
- [x] #3 Doubles and Individual rankings render as rank/name/rating tables matching the mockup; no win % column
- [x] #4 Match sections hide when there is no data (leaderboard still shows); player names link to their public profiles where applicable
- [x] #5 Unit + e2e cover the new sections; lint, build, unit and e2e all pass
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Data: add loadScheduledMatches + loadRecentResults to play/api.ts (Supabase join on match_sessions + E2E store helpers) and useScheduledMatches/useRecentResults hooks.
2. Ranking: add a side-rating resolver (pair board keyed by sorted ids, fallback to avg individual rating).
3. UI: rewrite Home.tsx — ScheduledMatches card grid, RecentResults list, ranking tables (rank circle, names, rating); relative-time + rating formatters; names link to /players/:id.
4. Keep leaderboard-only-when-empty behaviour; preserve data-testid=home + view-all.
5. Update Home.test.tsx for the new hooks/markup; add an e2e assertion. Run lint+build+unit+e2e; finalize + commit + merge.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented per mockup with user-confirmed scoping: real app data, DOUBLES-only badge, no WIN % column. Data: added loadScheduledMatches/loadRecentResults to play/api.ts (Supabase !inner embed on match_sessions, sorted+sliced client-side; cast embed rows via unknown like loadRecentForm) + e2eFeed() helper in e2eStore.ts + useScheduledMatches/useRecentResults hooks. UI: rewrote Home.tsx — ScheduledMatches card grid (badge, Court #N, friendly date/time via whenLabel, both sides' names + pair rating via useSideRating which prefers the pair board then falls back to avg individual rating), RecentResults list (winner highlighted accent-strong, 21-18 score, relative timeAgo), and Doubles/Individual RankTable (rank-1 green circle, names link to /players/:id, comma-formatted rating). Match sections hide when empty so leaderboard-only-when-no-draws (TASK-9.2) is preserved; no public match-detail/schedule page exists so dead buttons/links were omitted and names link to profiles instead. Replaced Home.test.tsx mocks (useSessions→useScheduledMatches/useRecentResults) with 4 cases; added play.spec e2e 'public home surfaces scheduled matches and recent results'; updated leaderboard.spec home-preview assertions to the new table test-ids. Verified: lint clean, build OK, 151 unit pass, 22 e2e pass (chromium).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Redesigned the public home's match + ranking sections to the GameOn mockup. Scheduled Matches now renders unscored courts from live game days as cards (DOUBLES badge, court, game-day date/time, each side's names + pair rating); Recent Results lists recently played courts newest-first with the winner highlighted, the score, and a relative timestamp; Doubles and Individual rankings render as clean rank/name/rating tables (rank-1 green circle, names linking to public profiles). All wired to real app data with E2E-store support; match sections hide when empty so the leaderboard-only state is preserved; WIN % omitted (not stored) and badge is doubles-only, per the agreed scope. Verified with lint, build, 151 unit tests and 22 e2e (chromium).
<!-- SECTION:FINAL_SUMMARY:END -->
