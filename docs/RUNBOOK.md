# Runbook — setup, run, deploy

Operational guide for the GameOn / BadmintonDuo monorepo. For the *why* behind
the stack, see the [ADR index](adr/README.md); for roles and product rules, see
[REQUIREMENTS.md](REQUIREMENTS.md).

## Prerequisites

- **Node** 20+ and **npm** 10+ (the repo uses npm workspaces).
- A **Supabase** project (Postgres + Auth) for real data. The app ships with an
  E2E bypass so tests run without one.
- The **Supabase CLI** (`supabase`) for migrations, and the **Playwright**
  browsers for e2e (`npx playwright install`).

## Setup

```bash
npm install                      # installs all workspaces
cp apps/badminton/.env.example apps/badminton/.env
```

Fill `apps/badminton/.env` with your project's values:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → publishable key (`sb_publishable_…`) |

The publishable key is safe to ship — **RLS is the guard**. The secret key
(`sb_secret_…`) is server-only and lives as a Supabase Edge Function secret;
never put it in the app `.env`.

### Database

Migrations are tracked SQL under `supabase/migrations/` (RLS on every table).
Apply them to a linked project with:

```bash
supabase link --project-ref YOUR-REF
supabase db push
```

## Run (development)

```bash
npm run dev          # Vite dev server for apps/badminton (http://localhost:5173)
```

## Test

```bash
npm test             # unit + component tests (Vitest, all workspaces)
npm run test:watch   # watch mode
npm run test:e2e     # Playwright e2e (runs with VITE_E2E=1, no Supabase needed)
npm run lint         # ESLint
npm run format:check # Prettier check
```

## Build

```bash
npm run build        # tsc --noEmit + vite build -> apps/badminton/dist
npm run preview      # serve the production build locally
```

## Deploy (Cloudflare Pages)

Hosting is Cloudflare Pages ([ADR 0004](adr/0004-hosting-cloudflare-pages.md)),
served from a subdomain of `badmintonduo.club`
([ADR 0008](adr/0008-domain-subdomain.md)).

1. Connect the repo as a Cloudflare Pages project (or use `wrangler pages deploy`).
2. **Build command:** `npm run build` · **Output directory:** `apps/badminton/dist`.
3. **Environment variables:** set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` for the production environment.
4. As an SPA, route all paths to `index.html` (Pages does this for SPA builds; add
   a `_redirects` `/* /index.html 200` if a deep link 404s).

Edge Functions (privileged ops, e.g. `create-matchmaker`) deploy to Supabase, not
Cloudflare: `supabase functions deploy <name>` with secrets set via
`supabase secrets set`.

## Workspace layout

```
apps/badminton    Vite SPA (React + TS) — the badminton app
packages/ui       Emerald Pro design system (tokens + primitives)
packages/domain   pure logic: match generation, ranking, fund math (+ tests)
packages/supabase typed Supabase client + generated types + auth helpers
supabase/         tracked SQL migrations + Edge Functions
docs/             ADRs, requirements, this runbook
```
