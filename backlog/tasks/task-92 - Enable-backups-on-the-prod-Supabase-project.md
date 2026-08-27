---
id: TASK-92
title: Enable backups on the prod Supabase project
status: To Do
assignee: []
created_date: '2026-08-26 23:02'
updated_date: '2026-08-27 07:20'
labels: []
dependencies: []
priority: low
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
DECLINED 2026-08-27. Owner decided against paid backups: Supabase PITR is a $100/mo add-on and daily backups need Pro, which is not worth it for a club app. A free self-hosted alternative (scheduled pg_dump via GitHub Actions) was offered and also declined - no backups wanted.

The accepted risk, stated explicitly: prod has NO recovery point of any kind. A bad migration, a stray script, or any data loss outside delete_game_day is permanent. The 2026-08-26 incident is the precedent for what that costs.

What covers the actual concern instead is TASK-91 (shipped): delete_game_day archives every game day before removing it and refuses outright to delete one with scored matches unless forced, so an accidental game-day delete is recoverable without any backup. That is a narrow protection - it covers game-day deletes and nothing else.

Do not action this task unless the owner revisits the decision.
<!-- SECTION:NOTES:END -->
