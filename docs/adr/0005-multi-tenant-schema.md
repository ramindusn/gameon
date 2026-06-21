# ADR 0005 — Multi-tenant-ready schema (single club to start)

**Status:** Accepted (2026-06)

## Context
GameOn is a multi-sport platform and may host multiple clubs later. Adding tenancy
columns now is cheap; retrofitting them later means a schema migration + backfill.

## Decision
Make the schema **multi-tenant-ready from day one**: every domain table carries a
`club_id` and is scoped by **RLS**. Run a **single club** initially.

## Consequences
- A few extra columns/policies now; scaling to more clubs/sports needs **no migration**.
- RLS policies scope by club membership via security-definer helper functions.
- Player visibility for the public site is handled with public-read policies where needed.
