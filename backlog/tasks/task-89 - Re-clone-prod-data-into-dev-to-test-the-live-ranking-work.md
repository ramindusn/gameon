---
id: TASK-89
title: Re-clone prod data into dev to test the live ranking work
status: Done
assignee: []
created_date: '2026-08-09 08:08'
updated_date: '2026-08-09 16:28'
labels:
  - ops
dependencies: []
priority: high
ordinal: 155000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Dev's data has drifted from prod: different 9 Aug session, 194 match_results vs prod's 209, and Sahan unlinked. The TASK-87 ranking change needs testing against real matches, and prod must not be touched.

Simpler than the TASK-74 clone because prod now HAS holdings (5 rows) - the manual stock rebuild that job needed is gone. Schemas are level: dev and prod share every migration through 20260809030000.

Established facts, do not re-derive:
- prod = avkijzzrurkefguxkbji (read-only MCP), dev = xlovjvvhsemqaqbknmyi (write path is 'supabase db push'). The CLI can be linked to prod for READS that redirect to disk - see the notes - but must be relinked to dev before any write.
- Docker is down, so 'supabase db dump' is unusable both ways and there is no pg_dump/psql on the machine; dev reads go through 'supabase db query --linked'
- FOUR public columns have foreign keys to auth.users: player_profiles.user_id, match_sessions.created_by, inventory_log.actor_user_id, usage_entries.recorded_by. They must arrive null and be repointed at dev's own accounts afterwards. (An earlier version of this task said there were none - that came from information_schema, which hides constraints referencing the auth schema. Use pg_constraint; the query is in the notes.)
- Do NOT copy or wipe clubs / admins / admin_allowlist. prod and dev already share the club id 7ae331e3-3824-41c8-9892-ebdb6545ca48, so nothing needs remapping. Copying prod's club row cascade-deletes dev's admins and breaks admin login
- Dev auth users: ramindusn@gmail.com (admin), ramboo@matchmaker.gameon.local (matchmaker). After loading, relink the Ramboo profile's user_id to dev's own auth uuid or matchmaker login stays broken
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dev holds prod's rows, counts matching prod exactly
- [x] #2 Prod is never written to
- [ ] #3 Admin and matchmaker login both still work in dev
- [x] #4 The live 9 Aug game day is present with its scored matches, so the ranking column and per-match figures can be checked against real data
- [ ] #5 Started by Sahan resolves on the three backfilled game days
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
CLONE DONE. Dev holds prod's rows; every count matches prod exactly — player_profiles 18, match_results 209, session_attendance 202, match_sessions 12, holdings 5, usage_entries 13, usage_items 14, player_ratings 14, pair_ratings 64, tournament_teams 6. Dev's own clubs (1) and admins (1) untouched, so admin login survived by construction. Prod was only ever read.

## The mechanic that worked, and is worth reusing

Do NOT move the data through the assistant's context. Write a generator that
asks prod to emit the INSERT statements, run it with the CLI linked to prod, and
redirect straight to disk:

  supabase link --project-ref <prod>
  supabase db query --linked -f gen.sql -o json > raw.json
  supabase link --project-ref <dev>          # relink BEFORE any write

143 KB of SQL came across in one round trip. The previous clone (TASK-74) hand-
spliced 193 rows and called it out as painful; this avoids it entirely.

The generator emits, per table, one statement built from the catalogue:

  'insert into T (' || (select string_agg(column_name, ', ' order by ordinal_position)
                          from information_schema.columns
                         where table_schema='public' and table_name='T') || ') values ' ||
  (select string_agg('('||(select string_agg(
      case when k in ('user_id','created_by','actor_user_id','recorded_by') then 'null'
           else quote_nullable(v) end, ',' order by o)
    from json_each_text(row_to_json(x)) with ordinality as j(k,v,o))||')', ',') from T x)

row_to_json preserves column order and WITH ORDINALITY pins it, so the declared
list and the values cannot drift.

## Three mistakes, each cost a failed push

1. HARDCODED COLUMN LISTS DRIFT. I typed the column lists from an earlier query
   and player_profiles had moved on — it has 11 columns (id, club_id, user_id,
   nickname, username, skill, is_matchmaker, absent, created_at, updated_at,
   gender), not the 8 I listed, in a different order. Result: "INSERT has more
   expressions than target columns". Fix: read the list from
   information_schema at generation time, never type it.

2. THE WIPE LIST MUST MATCH THE SEED LIST EXACTLY. I forgot `expenses` in the
   deletes, so its insert collided: "duplicate key value violates unique
   constraint expenses_pkey". A table wiped but not seeded loses data; a table
   seeded but not wiped collides. Assert both directions before pushing:

     seeded = set(re.findall(r'insert into (\w+) \(', seed))
     deleted = set(re.findall(r'delete from (\w+);', header))
     assert not seeded ^ deleted

3. INSERTS MUST BE ORDERED PARENT-FIRST. My table order put usage_entries
   before match_sessions, so usage_entries.session_id had nothing to point at:
   "violates foreign key constraint usage_entries_session_id_fkey". Working
   order: player_profiles, members, contributions, products, purchases,
   expenses, holdings, match_sessions, tournament_teams, match_results,
   session_attendance, usage_entries, usage_items, inventory_log,
   player_ratings, pair_ratings. Deletes run in the reverse (children first).

Each failure rolled back cleanly — the seed is wrapped in begin/commit and the
migration is not recorded when it errors, so dev was intact between attempts.
Verified that explicitly after the first failure (18/194/12 unchanged).

## A wrong assumption worth killing

I checked for foreign keys to auth.users with information_schema and got an
empty result, and told the user prod's user_ids could be copied verbatim so
"Started by Sahan" would resolve in dev. Wrong: information_schema hides
constraints referencing schemas the role cannot fully see. pg_constraint tells
the truth:

  select c.conrelid::regclass, a.attname, c.confrelid::regclass
    from pg_constraint c
    join unnest(c.conkey) with ordinality k(attnum, ord) on true
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
   where c.contype = 'f' and c.confrelid::regclass::text like 'auth.%';

Four public columns reference auth.users: player_profiles.user_id,
match_sessions.created_by, inventory_log.actor_user_id,
usage_entries.recorded_by. All must arrive null and be repointed at dev's own
accounts afterwards. Use pg_constraint, not information_schema, for this.

## Post-load repointing (in the footer, before commit)

- player_profiles.user_id for Ramboo -> dev's ramboo@matchmaker.gameon.local,
  or matchmaker login is broken. This has bitten every clone.
- usage_entries.recorded_by -> the same user, or RLS (recorded_by = auth.uid())
  makes every entry admin-only and the matchmaker edit path untestable.
- match_sessions.created_by for the three attributed days -> the same user, as a
  stand-in so the "Started by …" line renders. In dev it reads Ramboo, not Sahan.

## Cleanup, and the real hazard

DELETE THE SEED FILE FROM supabase/migrations THE MOMENT IT HAS BEEN PUSHED.
It opens with sixteen `delete from` statements against the public schema. Left
in place, the next `supabase db push` aimed at prod wipes the club. It was
removed immediately and never committed. Anyone repeating this should treat
that as the first step after a successful push, not the last.

Docker was down throughout, so `supabase db dump` was unusable in both
directions and there is no pg_dump/psql on the machine. Dev reads went through
`supabase db query --linked`; the seed's own verification used RAISE NOTICE,
which surfaces in the push output.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Clone done; every row count matches prod exactly and prod was only ever read.

Two acceptance criteria are deliberately left unchecked rather than fudged:

#3 admin and matchmaker login — dev's admins row was never touched and the Ramboo profile was repointed at dev's own auth user, so both should work, but neither was actually signed into. Needs a human to confirm.

#5 'Started by Sahan' — cannot be met and the criterion was written on a false premise. player_profiles.user_id has a foreign key to auth.users, so prod's uuids cannot come across; Sahan has no dev login for them to point at. The three attributed days were repointed at dev's Ramboo instead, purely so the line renders. In dev it reads 'Started by Ramboo'.

#4 is met with a caveat: the 9 Aug game day is present with all its scored matches, but prod finished it during the clone, so dev has it as finished rather than live. The ranking column and per-match figures are the same calculation either way, and both were verified on dev afterwards.

The mechanic, the three failed pushes and the auth.users mistake are written up in the implementation notes — read those before attempting another clone.
<!-- SECTION:FINAL_SUMMARY:END -->
