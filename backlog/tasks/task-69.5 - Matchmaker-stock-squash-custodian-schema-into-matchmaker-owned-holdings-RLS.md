---
id: TASK-69.5
title: 'Matchmaker stock: squash custodian schema into matchmaker-owned holdings + RLS'
status: Done
assignee:
  - '@ramindusn'
created_date: '2026-08-04 08:43'
updated_date: '2026-08-04 11:09'
labels:
  - feature
  - inventory
  - schema
dependencies: []
parent_task_id: TASK-69
ordinal: 127000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the custodians/holdings/inventory_log custodian model with holdings keyed directly to a matchmaker (player_profiles). The two unreleased custodian migrations are squashed into one clean migration (dropped from dev + migration history first) so prod never runs create-then-drop. Existing product stock migrates to the Ramboo matchmaker profile. RLS: admins read/write everything; matchmakers may READ holdings + products (to see their own stock); no matchmaker write path yet — that lands with game-day usage. inventory_log stays append-only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 holdings keyed to a matchmaker (player_profiles), unique per (product, holder), non-negative counts
- [x] #2 Single squashed migration; the superseded custodian migrations are removed from the repo and from dev history
- [x] #3 Existing stock migrates to Ramboo with per-brand totals unchanged
- [x] #4 RLS: admin read/write; matchmaker read-only on holdings and products; inventory_log append-only
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Squashed the two unreleased custodian migrations (dropped their objects on dev, 'supabase migration repair --status reverted', deleted the files) into one clean 20260804020000_matchmaker_stock.sql, so prod never runs create-then-drop.

New shape: holdings keyed to player_profiles (holder_id, ON DELETE RESTRICT so losing a roster row can't silently erase stock records), unique per (product, holder), non-negative. inventory_log gains 'allocate'/'usage' actions and denormalised holder_name/product_label/actor_name. No parallel custodian identity table — the roster already knows who the matchmakers are and their user_id drives RLS.

Backfill hands each club's stock to the matchmaker nicknamed Ramboo, falling back to the club's first matchmaker, and only raises a notice (not an exception) if a club has none. Verified on dev: RSL 18+2 and Victor 9+2 now held by Ramboo.

RLS: holdings admin ALL + matchmaker SELECT; inventory_log admin SELECT/INSERT only with update/delete/truncate revoked (append-only); products gains a matchmaker SELECT policy, without which a matchmaker could not name the shuttles they hold.

DRIFT FOUND: between the first backfill and this one, products.loose_shuttles changed (RSL 5→2, Victor 8→2) — the legacy usage path still writes the old pool and would not have updated holdings. This is why holdings must become the single source of truth; the usage task moves usage onto holdings and a later migration drops products.barrels/loose_shuttles.
<!-- SECTION:NOTES:END -->
