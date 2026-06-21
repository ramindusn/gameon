# ADR 0006 — Data layer: TanStack Query

**Status:** Accepted (2026-06)

## Context
The earlier prototype used a bespoke, hand-rolled sync layer that caused subtle bugs.
We want consistent caching, loading/error states, invalidation, and optimistic updates
over the Supabase client.

## Decision
Use **TanStack Query (@tanstack/react-query)** as the single data-access pattern over
`supabase-js`, everywhere.

## Consequences
- Less boilerplate; predictable cache/refetch/mutation handling.
- One consistent pattern across all features (no ad-hoc fetching).
- Pairs with Supabase realtime later if we want live updates.
