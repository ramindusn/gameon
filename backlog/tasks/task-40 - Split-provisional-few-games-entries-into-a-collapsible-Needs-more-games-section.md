---
id: TASK-40
title: >-
  Split provisional (few-games) entries into a collapsible 'Needs more games'
  section
status: Done
assignee: []
created_date: '2026-07-12 10:08'
updated_date: '2026-07-12 10:08'
labels:
  - feature
  - ranking
  - ui
dependencies: []
ordinal: 94000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The PROV tag bloated the Doubles board (most pairs have played 1-2 games). Established entries (RD<150) now rank in the main board; provisional ones move to a collapsible 'Needs more games (N)' section (auto-expanded when no established entries). Applied to Individual + Doubles; Home preview shows established leaders only. UI-only, no data change.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Established (RD<150) rank in the main board; provisional collapse under 'Needs more games'
- [x] #2 Applied to both Individual and Doubles boards; Home preview shows established only
- [x] #3 PROV badge removed; section auto-expands when there are no established rows
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Provisional (RD<150) entries split into a collapsible 'Needs more games (N)' section on both boards; established rank in the main board. PROV badge removed; section auto-expands when no established rows. Home preview shows established leaders only. UI-only. Verified against prod data (Doubles: 5 established + 49 collapsed).
<!-- SECTION:FINAL_SUMMARY:END -->
