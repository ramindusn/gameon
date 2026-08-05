---
id: TASK-69.1
title: >-
  Custodian schema: custodians + per-custodian holdings + inventory audit log
  (migration + RLS)
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-08-04 06:51'
updated_date: '2026-08-04 08:44'
labels:
  - feature
  - inventory
  - schema
dependencies: []
parent_task_id: TASK-69
ordinal: 123000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a custodians table (club-scoped; optional user_id linking the admin who is this holder; a name/label) and a holdings table keyed by (product_id, custodian_id) with barrels + loose_shuttles, replacing the single-pool columns on products as the source of truth for stock. Add an inventory_log audit table (actor user_id, custodian_id, product_id, action, before/after or delta, occurred_at, note). Migrate existing products.barrels/loose_shuttles into a default 'Main store' custodian holding so nothing is lost. Keep everything admin-only (reuse is_admin RLS); inventory_log is insert+select for admins, no update/delete.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 custodians, holdings, and inventory_log tables created, club-scoped, with FK indexes
- [x] #2 Existing per-product stock migrated into a default custodian holding; totals per brand are identical before/after
- [x] #3 RLS: all three tables admin-only via is_admin(club_id); inventory_log has no update/delete policy (append-only)
- [x] #4 holdings enforces non-negative barrels/loose and unique (product_id, custodian_id)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added supabase/migrations/20260804000000_shuttle_custodians.sql: custodians (club-scoped, nullable user_id linking an admin login, is_default flag, partial unique index on (club_id,user_id) where user_id not null), holdings (unique (product_id,custodian_id), non-negative barrels/loose), and inventory_log (append-only audit: actor_user_id, custodian/product FKs ON DELETE SET NULL plus denormalised custodian_name/product_label so history survives deletion, action check add|adjust|transfer|migrate, deltas + after-values, occurred_at).

Backfill moves each club's existing products.barrels/loose_shuttles into a default 'Main store' custodian holding and writes an opening-balance 'migrate' log row; idempotent (guards on is_default custodian + existing migrate row).

COMPATIBILITY: products.barrels/loose_shuttles deliberately left in place and unchanged — the running app still reads them. Holdings become source of truth in TASK-69.3; a later cleanup migration drops the redundant columns. This keeps the deployed client working while the schema lands.

RLS: custodians/holdings admin-only via is_admin(club_id) (unchanged auth model). inventory_log has SELECT+INSERT policies only — no UPDATE/DELETE policy. Found that Supabase default privileges still granted ALL on the new table, so added an explicit revoke update/delete/truncate from authenticated, anon (defense in depth, and makes append-only visible at grant level).

Regenerated packages/supabase/src/database.types.ts. NOTE: 'supabase gen types' leaked a PostHog error JSON line onto stdout into the file (would have been a syntax error) — stripped before installing.

Applied to DEV only (linked project = ramindusn's Project; prod GameON untouched). Verified on dev: holdings match pre-migration stock exactly (RSL 18 barrels+5 loose, Victor 9+8; identical=true both), audit log seeded with 2 opening balances, policies show only SELECT/INSERT on inventory_log, constraints present. Gates: typecheck, lint, 264/264 unit, build all green.

SUPERSEDED (2026-08-04): the admin-custodian model was replaced by matchmaker-owned stock. Barrels are now allocated to matchmakers who keep them; assignment is mandatory; admins transfer between matchmakers; matchmaker write access is limited to their own game-day usage (follow-up task). The custodians table and 'Custodian' vocabulary are dropped. These migrations were never committed or deployed to prod, so they are squashed into a single clean migration rather than shipping create-then-drop churn.
<!-- SECTION:NOTES:END -->
