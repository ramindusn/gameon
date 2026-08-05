---
id: TASK-74
title: Clone prod data into dev for testing (TASK-70/71/72/73 branch)
status: In Progress
assignee:
  - '@claude'
created_date: '2026-08-05 12:03'
updated_date: '2026-08-05 12:30'
labels:
  - ops
dependencies: []
priority: high
ordinal: 135000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Load prod's data into dev so the game-day usage / stock / dashboard work on branch task-70-71-usage-popup-single-game-day-page can be tested against real data. Prod is READ-ONLY throughout — dev is expendable and gets wiped. User's decision: copy everything as-is, emails included.

PROJECTS: prod = avkijzzrurkefguxkbji ('GameON'), dev = xlovjvvhsemqaqbknmyi ('ramindusn's Project').

ACCESS (established, do not re-derive):
- Dev WRITE works with no password: the Supabase CLI is linked to dev and 'supabase db push --dry-run' connects fine. Dev is fully migrated. Keep the CLI linked to DEV so nothing can ever target prod.
- Prod READ is via the hosted MCP added to .mcp.json ('supabase', read_only=true, project_ref=avkijzzrurkefguxkbji). It was authenticated via /mcp but its tools only load on a session RESTART.
- The older 'supabase-gameon' MCP returns Unauthorized — remove it to avoid two prod servers.
- Do NOT scrape the keychain or fetch service-role keys; both were correctly blocked by the sandbox classifier.

STEPS ONCE THE MCP IS LIVE:
1. Read prod's public schema data via the MCP (SELECT only).
2. Wipe dev's public data (schema stays — dev is already migrated).
3. Load prod's rows into dev via a pushed migration file (supabase db push is the write path). Delete the seed migration file afterwards; dev-only history is fine.
4. Strip auth.users references on the way in — player_profiles.user_id, usage_entries.recorded_by, inventory_log.actor_user_id, admins.user_id. Dev's auth.users are different people, and a public-schema-only copy would fail those FKs outright.
5. Rebuild holdings: prod predates the matchmaker_stock migration so it has NO holdings; its stock lives in the club-wide products.barrels/loose_shuttles. Dev's backfill already ran against an empty DB, so re-run that mapping by hand (existing stock -> Ramboo, falling back to the club's first matchmaker) or every matchmaker shows zero and the usage form says 'Nobody is holding stock'.
6. Re-link Ramboo in dev: set player_profiles.user_id from dev's own auth.users by email, and is_matchmaker = true, or matchmaker login stays broken (this has bitten before).
7. Verify: matchmaker + admin sign-in, stock visible, admin usage panel lists game days.

EXPECTED AND CORRECT AFTERWARDS: every game day shows as 'missing usage', because prod's usage_entries have no session_id. That exercises the new admin panel rather than indicating a bug.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dev holds prod's data and the app runs against it
- [x] #2 Prod is never written to
- [ ] #3 Matchmaker and admin login both work in dev after the clone
- [x] #4 Matchmakers show their stock (holdings rebuilt), not zero
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Session restart confirmed the access picture:
- supabase-gameon (stdio, prod, read-only) still returns Unauthorized — its access token is dead. Not usable.
- The 'supabase' HTTP MCP (prod, read_only=true) loaded but needs an OAuth round trip; authorize URL handed to the user. All requested scopes are :read.
- Dev write path confirmed working: 'supabase db push --dry-run' connects and reports 'Remote database is up to date'. CLI stays linked to dev (xlovjvvhsemqaqbknmyi).
- Docker is not running, so 'supabase db dump' is unavailable in both directions. Reading dev has to go through RAISE NOTICE inside a pushed migration; writing dev goes through 'supabase db push'. No psql on this machine.
- Public tables to copy: clubs, admin_allowlist, admins, player_profiles, members, contributions, products, purchases, usage_entries, usage_items, expenses, match_sessions, match_results, player_ratings, pair_ratings, session_attendance, holdings, inventory_log.
Blocked on prod OAuth before any data can move.

CLONE DONE. Dev now holds prod's data; all counts match prod exactly (player_profiles 18, members 4, products 2, contributions 4, purchases 2, expenses 1, match_sessions 11, match_results 193, session_attendance 184, player_ratings 14, pair_ratings 62).

KEY DEVIATION FROM THE ORIGINAL PLAN, and it turned out better: clubs/admins/admin_allowlist were NOT wiped or copied. Prod's club_id was remapped onto dev's existing club (7ae331e3) instead. Copying prod's club row would have cascade-deleted dev's admins rows (admins.club_id is ON DELETE CASCADE) and broken admin login — the very thing step 6 was there to repair. Remapping keeps admin sign-in working by construction, so no post-hoc re-linking was needed.

Matchmaker relink was generalised rather than hardcoded to Ramboo: user_id is resolved from dev's own auth.users by the synthetic email <username>@matchmaker.gameon.local. Dev has exactly one such account, so Ramboo relinked (1 profile) and the rest stayed null — correct, since those matchmakers have no dev login.

Holdings rebuilt by hand as planned: the whole club pool went to Ramboo — RSL Classic Academy 17 barrels + 1 loose, Victor New Carbonsonic Pro 7 barrels + 10 loose — plus two 'migrate' inventory_log rows. products.barrels/loose_shuttles are prod's live figures and are ALREADY net of the copied usage, so holdings were mirrored from them and NOT deducted a second time.

usage_entries.recorded_by was set to dev's Ramboo auth user rather than left null. The task said strip auth.users refs, and the reason given was FK integrity; pointing them at a valid dev user satisfies that while leaving the matchmaker edit path (RLS: recorded_by = auth.uid()) reachable in dev. Null would have made every entry admin-only and untestable.

SCOPE ADDED MID-TASK at the user's request: rather than accepting 'every game day shows missing usage', usage_entries.session_id was reconstructed. 9 of 11 entries map 1:1 to a game day ~3h earlier. Jun 23 and Jul 19 each ran TWO game days logged as ONE entry, which a single-column FK cannot express — user chose to split them, apportioned by rounds (Jun 23 6xRSL -> 3+3; Jul 19 6xVictor -> 4+2), so 13 entries / 14 items now, totals unchanged at 61 shuttles. Split halves carry synthetic aaaa… ids. Result: 0 game days without usage. The two earliest entries (Jun 17, Jun 21) predate every game day and stay unlinked on purpose — they exercise the 'no game day' path.

MECHANICS, for whoever does this next: Docker was down, so 'supabase db dump' was unusable both ways. Writes went through 'supabase db push'; READS of dev went through RAISE NOTICE inside a throwaway pushed migration, which works well and is how every figure above was verified. The 193-row match_results payload exceeded the MCP response limit, so it was written to disk by the tool, regex-validated (all 193 tuples exactly 12 literal fields) and spliced into the migration by script, never retyped.

Both temporary migrations (20260805140000 clone, 20260805150000 verify) plus the earlier probe (20260805130000) were deleted and their history rows repaired to 'reverted'. 'supabase db push --dry-run' reports 'Remote database is up to date' and git is clean.

PROD UNTOUCHED: the only prod access was the read_only=true MCP, SELECTs exclusively. The prod-side equivalent of the session_id backfill is now TASK-75.
<!-- SECTION:NOTES:END -->
