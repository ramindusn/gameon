---
id: TASK-79
title: Make the stock audit trail un-skippable
status: To Do
assignee: []
created_date: '2026-08-05 20:39'
labels:
  - security
dependencies: []
priority: medium
ordinal: 145000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-78 closed the permission gaps but left the audit trail only partly enforced. restore_usage_holdings() writes its inventory_log row inside the database, so that path cannot be logged incorrectly or skipped. Four other stock writers still log from the client, which means the log is advisory for them: nothing in the database requires the entry, so a caller going around the UI can change stock and leave no trace.

CLIENT-SIDE WRITERS STILL TO MOVE (all in apps/badminton/src/fund):
- api.ts saveStockChange()  — allocate / adjust (admin)
- api.ts transferStock()    — hand barrels between matchmakers (admin, logs both sides)
- api.ts deleteHolding()    — remove a stock record (admin)
- usageApi.ts recordGameDayUsage() — the matchmaker path, and the one that matters most: it is the only one a non-admin can reach

SHAPE OF THE FIX: mirror restore_usage_holdings(). One security-definer function per operation that performs the holdings write and its inventory_log row in a single transaction, with the permission check inside it. The client then calls the RPC and cannot separate the two. Once every writer goes through a function, the direct UPDATE grant on holdings can be revoked from authenticated entirely and the drawdown trigger becomes a backstop rather than the only guard.

WATCH OUT (cost a debugging round on TASK-78): security definer does NOT change auth.uid(), so is_admin() inside a trigger is still evaluated as the CALLER. The drawdown trigger therefore refuses a legitimate increase made from inside an RPC unless the function announces itself — restore_usage_holdings sets a transaction-local app.usage_reversal flag after its permission check, and the trigger honours it. Any new function that raises stock needs the same treatment.

NOT URGENT: none of this is reachable by an outsider — signed-out access to every stock table is denied, verified by an anon write that left the data untouched. The exposure is a club member with a matchmaker login using the API directly, which is a trust question rather than a security hole.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every holdings write goes through a database function that logs it in the same transaction
- [ ] #2 A stock change cannot be made without its inventory_log entry
- [ ] #3 The direct UPDATE grant on holdings is revoked from authenticated once no client path needs it
- [ ] #4 Functions that raise stock still work under the drawdown trigger
<!-- AC:END -->
