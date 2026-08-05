---
id: TASK-69
title: 'Shuttle custodians: per-holder stock, club overview, and audit log'
status: To Do
assignee: []
created_date: '2026-08-04 06:51'
updated_date: '2026-08-04 11:18'
labels:
  - feature
  - inventory
  - admin
dependencies: []
ordinal: 122000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shuttle barrels are allocated to MATCHMAKERS, who physically keep them. Admins allocate and move stock; matchmakers hold it and (in the follow-up task) record game-day usage that draws down their own barrels. Replaces the earlier admin-custodian model.

Rules:
- Every barrel belongs to a matchmaker. Assigning a matchmaker is MANDATORY when an admin adds stock.
- Admins can transfer barrels/loose shuttles from one matchmaker to another.
- Admins see the overall picture: club summary per brand plus who is holding what, and (follow-up) usage.
- A matchmaker can see the stock in their own hands.
- Matchmaker write access is limited to recording their OWN game-day usage, and editing only their own entries. Allocation, transfers and corrections stay admin-only.
- Every stock change is audited with who made it and when.

Existing stock migrates to Ramindu's matchmaker profile (Ramboo), who currently keeps the barrels.

Scope split: this task covers allocation, transfer, summary and the matchmaker's own-stock view. Game-day usage (recording before finishing, adding it after finishing and linking it to the game day, and admin usage/expense reporting) is the follow-up and absorbs TASK-35.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Stock is held per matchmaker; a club summary shows total barrels + loose shuttles per brand across all holders
- [x] #2 Adding stock requires assigning it to a matchmaker (cannot be left unassigned)
- [x] #3 An admin can transfer barrels/loose shuttles from one matchmaker to another
- [x] #4 A matchmaker can see the stock in their own hands
- [x] #5 Every stock change is recorded in an append-only audit log with who made it and when
- [x] #6 Matchmakers cannot allocate, transfer or correct stock; those remain admin-only
- [x] #7 Existing stock migrates to the Ramboo matchmaker profile with per-brand totals unchanged
<!-- AC:END -->
