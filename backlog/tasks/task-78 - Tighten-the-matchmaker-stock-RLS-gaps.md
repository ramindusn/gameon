---
id: TASK-78
title: Tighten the matchmaker stock RLS gaps
status: Done
assignee:
  - '@claude'
created_date: '2026-08-05 20:14'
updated_date: '2026-08-05 20:14'
labels:
  - security
dependencies: []
priority: high
ordinal: 144000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Three gaps found auditing stock permissions across roles. None reachable by an outsider — signed-out access to every stock table is denied and an anon write was verified to leave the data untouched. All three were 'a matchmaker going around the UI'.

1. usage_items INSERT checked only is_matchmaker, while UPDATE/DELETE both check the parent entry's recorded_by — a matchmaker could add items onto someone else's entry.
2. inventory_log INSERT checked only is_matchmaker, so a matchmaker could append audit rows naming anyone as actor. The log is append-only, so forged rows could not be removed.
3. holdings UPDATE let a matchmaker set ANY holder's stock to ANY value. Drawing another matchmaker's barrels down is deliberate (barrels are shared on a game day) but nothing stopped stock being invented, and nothing in the DB required the change to be logged.

FIXES: policies tightened for 1 and 2. For 3, RLS cannot compare old vs new (WITH CHECK sees only the new row), so a BEFORE UPDATE trigger enforces drawdown-only for non-admins.

The reversal path had to move into the database as a result: restore_usage_holdings() is security-definer, checks the caller owns the entry, and does the credit plus its audit row in one transaction. That also closes the 'audit trail is advisory' hole for that path — it was three client-side writes and nothing made a caller write the log.

GOTCHA WORTH REMEMBERING: security definer does NOT change auth.uid(), so is_admin() inside the trigger was still false when called from the RPC and the legitimate credit was refused. Verified against dev before shipping. The RPC now sets a transaction-local flag (app.usage_reversal) that the trigger honours, set after the permission check so it cannot be reached without one.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A matchmaker cannot add usage items to an entry they did not record
- [x] #2 A matchmaker cannot write an audit row naming another actor
- [x] #3 A matchmaker cannot increase any holding directly
- [x] #4 Reversing a deleted usage entry still works for its owner and for admins
<!-- AC:END -->
