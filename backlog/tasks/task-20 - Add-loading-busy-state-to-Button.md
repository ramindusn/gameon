---
id: TASK-20
title: Add loading/busy state to Button
status: To Do
assignee: []
created_date: '2026-06-27 22:34'
labels:
  - ui-ux
dependencies: []
priority: medium
ordinal: 74000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every page hand-rolls busy state with {pending ? 'Saving…' : 'Save'} + disabled (PlayersPage, GeneratePage, PlayPage, etc.) — inconsistent and no spinner. Add a loading prop to packages/ui Button that shows a spinner and disables the button, then adopt it at the call sites. Audit item #6.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Button accepts a loading prop that shows a spinner, disables interaction, and preserves layout width
- [ ] #2 Spinner is accessible (aria-busy / aria-hidden on the icon)
- [ ] #3 Key call sites (save score, create game day, save player, save line-up) use the loading prop instead of manual text swaps
- [ ] #4 Button unit test covers the loading state
<!-- AC:END -->
