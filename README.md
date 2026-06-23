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
- **Frontend:** Vite SPA (React + TypeScript) + Tailwind (Emerald Pro tokens)
- **Backend:** Supabase (Postgres + Auth + RLS); Supabase Edge Functions for privileged ops
- **Data layer:** TanStack Query
- **Hosting:** Cloudflare Pages
- **Tenancy:** multi-tenant-ready (`club_id` + RLS), single club to start
- **Monorepo:** npm workspaces
- **Tickets:** Backlog.md

## Quick start

```bash
npm install
cp apps/badminton/.env.example apps/badminton/.env   # add your Supabase URL + publishable key
npm run dev                                           # http://localhost:5173
npm test                                              # unit + component tests
```

Full setup, test, build and deploy steps are in the **[Runbook](docs/RUNBOOK.md)**.

## Docs
- **[Runbook](docs/RUNBOOK.md)** — setup, run, test, build, deploy
- **[ADR index](docs/adr/README.md)** — architecture decisions
- **[REQUIREMENTS.md](docs/REQUIREMENTS.md)** — roles + information architecture
