---
id: TASK-92
title: Enable backups on the prod Supabase project
status: To Do
assignee: []
created_date: '2026-08-26 23:02'
labels: []
dependencies: []
priority: high
ordinal: 158000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The prod project (avkijzzrurkefguxkbji, GameON) is on the Free plan, which has no scheduled backups and no PITR. This was discovered on 2026-08-26 while trying to recover an accidentally deleted game day: there was no restore point of any kind, local WAL had already been recycled (wal_keep_size=0, 9 segments retained), and the only remaining hope was raw heap access that requires superuser. See RECOVERY-2026-08-26.md and SUPPORT-TICKET-2026-08-26.md.

Prod holds a season of match history and ratings that cannot be reconstructed from anywhere else. Right now any cascade delete, bad migration or bad script is permanent.

Note that enabling PITR is not retroactive - it only protects from the moment it is switched on - so the sooner this lands the smaller the exposed window. Decide explicitly on cost: Pro includes daily backups; PITR is a paid add-on on top.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Prod is on a plan with scheduled daily backups, and a backup is confirmed present in the dashboard afterwards
- [ ] #2 An explicit written decision is recorded on whether to also enable the PITR add-on, including the cost tradeoff and the accepted worst-case data loss window
- [ ] #3 docs/RUNBOOK.md documents what backup coverage prod has, the retention period, and the step-by-step restore procedure
- [ ] #4 The restore procedure has been read end-to-end and its prerequisites verified, so it is not first attempted during an incident
- [ ] #5 Dev project backup posture is stated too, even if the decision is deliberately no backups
<!-- AC:END -->
