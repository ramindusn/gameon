# GameOn

Multi-sport club platform (monorepo). Badminton is the first sport app; more slot in
alongside over time.

## Layout
```
gameon/
  apps/
    badminton/        # first sport app (Vite SPA, React + TS)
  packages/
    ui/               # design system — Stitch-designed tokens, primitives, dual-render list
    supabase/         # Supabase client + generated types + auth helpers
    domain/           # pure logic: match generation, ranking, fund math (+ tests)
  supabase/
    migrations/       # tracked SQL migrations (RLS on every table)
  docs/
    adr/              # architecture decision records
    backlog/          # planning notes (tickets managed with Backlog.md → .backlog/)
```

## Stack (locked)
- **Frontend:** Vite SPA (React + TypeScript)
- **Backend:** Supabase (Postgres + Auth + RLS); Supabase Edge Functions for privileged ops
- **Data layer:** TanStack Query
- **Hosting:** Cloudflare Pages
- **Tenancy:** multi-tenant-ready (`club_id` + RLS), single club to start
- **Monorepo:** npm workspaces (Turborepo/pnpm later if needed)
- **Tickets:** Backlog.md

> Build-from-scratch project. The previous prototype (`../badminton-tracker`) is
> reference only — ideas are carried, no code/theme/data copied. UI designed fresh in Stitch.

Status: **skeleton only** — scaffolding (package.json, tooling, Supabase project, backlog)
comes next.
