---
id: TASK-76
title: Streamline the admin and matchmaker views
status: To Do
assignee: []
created_date: '2026-08-05 17:58'
labels:
  - ui
dependencies: []
priority: high
ordinal: 137000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The admin dashboard reads as scattered, the fund summary is not straightforward, stock counts are unclear across admin and matchmaker, and navigation changes shape depending on which page you are on. Five phases, agreed with the user on 2026-08-05, all shipping to prod in one deploy together with TASK-70/71/72/73.

DIAGNOSIS (verified against the code, not assumed):
- Navigation: the nav ITEMS are already identical on desktop and mobile (one NAV_BY_ROLE in AppShell.tsx). The inconsistency is per-PAGE — Home.tsx and PlayerProfilePage.tsx bypass AppShell entirely and render their own header, so the bottom tab bar vanishes when you open a player from the dashboard on a phone.
- DashboardPage.tsx labels state.members.length as 'Admins', but Member is a funding member (it carries contributions). It is a mislabel: 4 funding members vs 1 registered admin.
- FundSummary.tsx footer tells the user to log game-day usage via '+ Add transaction', a path TASK-73 retired — QuickAdd now offers only cash and expense.
- The Stock tab renders StockPanel and Inventory together; both read productStock() and both show per-product barrels + loose, so the same truth appears twice in two layouts.
- MyStock.tsx returns null when the matchmaker holds nothing, so they see no card at all and then meet 'Nobody is holding stock' in the usage form with nothing connecting the two.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Navigation is identical in shape on every page, on both desktop and mobile
- [ ] #2 No dashboard label or helper text describes something that is not true
- [ ] #3 Each stock number has exactly one place it is shown
- [ ] #4 Fund summary answers an actionable question rather than repeating a KPI card
- [ ] #5 Recording usage takes fewer steps for a matchmaker than it does today
<!-- AC:END -->
