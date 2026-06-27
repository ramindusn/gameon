---
id: TASK-17
title: Toast/notification system for action feedback
status: Done
assignee: []
created_date: '2026-06-27 22:33'
updated_date: '2026-06-27 22:43'
labels:
  - ui-ux
dependencies: []
priority: high
ordinal: 71000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mutations across the app (save score, create game day, update date, add/remove player, line-up edits) succeed or fail silently — there is no visible feedback and no toast system. Add a lightweight, themed toast/notification system in packages/ui and wire success + error toasts to the key mutations. Covers audit items #1 (no success feedback) and #3 (mutation errors not surfaced).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A reusable Toast/ToastProvider (or equivalent) exists in packages/ui with success and error variants, themed with Emerald Pro tokens
- [x] #2 Toasts auto-dismiss, are dismissible, stack, and are accessible (role=status/aria-live)
- [x] #3 Key matchmaker mutations show a success toast: save/update score, create game day, update game-day date, finish game day, add/remove player
- [x] #4 Mutation failures (network/RLS) show an error toast instead of failing silently
- [x] #5 Unit test covers the toast component render + dismiss
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added ToastProvider/useToast in packages/ui (success/error/info, auto-dismiss, dismissible, stacking, role=status aria-live). Mounted at app root and wired success+error toasts into all key mutations (create/finish/delete game day, save score, update date, line-up, add/remove match, add/update/remove player, create matchmaker). Toast.test.tsx covers render, dismiss, auto-dismiss, provider guard.
<!-- SECTION:FINAL_SUMMARY:END -->
