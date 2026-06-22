---
id: TASK-4.2
title: 'Generate UI (Stitch design): present -> rounds/courts -> matches'
status: Done
assignee:
  - '@claude'
created_date: '2026-06-19 10:42'
updated_date: '2026-06-22 18:36'
labels:
  - 'size:M'
  - E03
dependencies:
  - TASK-1.5
parent_task_id: TASK-4
ordinal: 26000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pick present players, choose rounds, render courts + sitting
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented GeneratePage (matchmaker /generate route): pick present players, choose rounds + format (Doubles/Mixed), render courts + sitting via the @gameon/domain generateRounds engine. Wired route in App.tsx (matchmaker-only) and nav in AppShell. Added GeneratePage.test.tsx (3 cases). All 51 unit tests pass, build + lint clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added matchmaker draw generator (/generate): select present players, pick rounds + format (Doubles/Mixed), render balanced courts + sitting using the @gameon/domain generateRounds engine. Wired matchmaker-only route + nav. Verified with GeneratePage.test.tsx (3 cases) and full suite (51 tests pass), build + lint clean.
<!-- SECTION:FINAL_SUMMARY:END -->
