---
id: TASK-23
title: 'UI polish: contrast, touch targets, modal motion'
status: Done
assignee: []
created_date: '2026-06-27 22:34'
updated_date: '2026-06-27 22:56'
labels:
  - ui-ux
dependencies: []
priority: low
ordinal: 77000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Lower-priority polish from the UI/UX audit: (8) verify/raise contrast for --fg-subtle and placeholder/60 text to meet WCAG AA on surface; (9) raise mobile touch targets toward 44px (bottom-nav items text-[11px] py-2 and default Button height ~36px); (10) add a subtle fade/scale transition to Modal/drawers for spatial continuity. Audit items #8-#10.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Body/subtle text and placeholders meet WCAG AA contrast on their backgrounds (light + dark)
- [x] #2 Primary tap targets (bottom nav, buttons) are at least ~44px on mobile
- [x] #3 Modal open/close has a subtle fade/scale transition (respecting prefers-reduced-motion)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Contrast: bumped --fg-subtle in both themes to AA-passing values (light #6D6D75, dark #9999A1) and raised placeholder to /70. Touch targets: Button min-h 2.75rem (~44px) and bottom-nav items min-h 3.25rem. Modal/drawer + toast motion (fade/scale) already added under TASK-18/17 using motion-safe (respects prefers-reduced-motion). Verified with build + full unit suite.
<!-- SECTION:FINAL_SUMMARY:END -->
