---
id: TASK-25
title: Replace emoji icons with themed line icons (titles + mobile nav)
status: Done
assignee: []
created_date: '2026-06-27 23:35'
updated_date: '2026-06-27 23:41'
labels:
  - ui-ux
dependencies: []
priority: medium
ordinal: 79000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Card title icons and the mobile bottom-nav use multicolour emoji (🎲 📊 👥 🏸 …) that clash with the neutral-black + green Emerald Pro theme. Replace them with a consistent monochrome line-icon set (lucide-react) that inherits the theme colour via currentColor — accent green for titles, accent/muted for active/inactive nav — so iconography is in rhythm with the theme.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Card title icons render as themed line icons (accent-tinted), not emoji
- [x] #2 Mobile bottom-nav icons are line icons; active = accent, inactive = muted
- [x] #3 All emoji icon= props across pages are replaced with the icon set
- [x] #4 Icons inherit currentColor and size consistently; lint + unit tests pass; build succeeds
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a central themed Icon component (lucide-react line icons + one custom shuttlecock) mapping semantic names to glyphs that inherit currentColor. Card title icons now render accent-green; mobile bottom-nav icons inherit active=accent/inactive=muted; StatCard/DualStatCard and Home's Section icons themed too. Replaced all ~33 emoji icon props across pages + nav. lint + 179 unit tests pass; build OK.
<!-- SECTION:FINAL_SUMMARY:END -->
