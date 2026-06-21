# ADR 0003 — Backend: client Supabase + RLS, Edge Functions for privileged ops

**Status:** Accepted (2026-06)

## Context
We need a database, auth, and an occasional privileged/server path (e.g. ranking
recompute, admin tasks) — while staying free and avoiding a server to maintain.

## Decision
Use **Supabase** (Postgres + Auth + Row-Level Security). Normal reads/writes go
**from the browser** to Supabase, guarded by RLS. The few privileged operations run in
**Supabase Edge Functions**. The **service-role key lives only in Edge Functions**,
never in the client bundle.

## Consequences
- No app server to run; **RLS is the real security boundary** — every table gets policies.
- Anon key ships in the client (expected); service role is server-only.
- Add a strict **Content-Security-Policy**, since the SPA stores the session in `localStorage`.
- A new, separate **free Supabase project** is used (the prototype's project is untouched).
