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

## PWA / offline

The app is an installable PWA (`vite-plugin-pwa`): the production build emits a
service worker that precaches the app shell, falls back to `index.html` offline,
and serves Supabase reads network-first (fresh online, cached offline). The
service worker only runs in the **production build** — `npm run dev` does not
register one, so development and e2e are unaffected. Verify offline behaviour via
`npm run build && npm run preview`, then DevTools → Application → Service Workers,
or toggle the Network "Offline" box and reload. App icons are generated from
`scripts/gen-pwa-icons.mjs` (`npm run gen:icons -w @gameon/badminton`).

## Environments

Two environments, each its own Supabase project (free tier = 2 projects):

| Env | URL | Supabase project | Built with |
|---|---|---|---|
| **Dev** | `badmintonduo.pages.dev` + local | `xlovjvvhsemqaqbknmyi` | `apps/badminton/.env` (mode `development`) |
| **Prod** | `badmintonduo.club` | `avkijzzrurkefguxkbji` | `apps/badminton/.env.production` |

The app picks its DB from build-time `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`.
Vite loads `.env` for dev and `.env.production` for the prod build, so the two
deploys carry different DBs. Both `.env*` files are git-ignored; CI uses repo
secrets instead.

## Deploy (Cloudflare Pages)

Hosting is Cloudflare Pages ([ADR 0004](adr/0004-hosting-cloudflare-pages.md)). SPA
deep links are handled by `apps/badminton/public/_redirects` (`/* /index.html 200`),
copied into `dist/` by the build.

```bash
npx wrangler login         # one-time browser auth to your Cloudflare account
npm run deploy:dev         # build (dev DB) → badmintonduo project → badmintonduo.pages.dev
npm run deploy:prod        # build (prod DB) → badmintonduo-prod project → badmintonduo.club
```

`npm run deploy` is an alias for `deploy:prod`. On every push to `main`, CI
(`.github/workflows/deploy.yml`) builds with the prod repo secrets and deploys to
the `badmintonduo-prod` project (dormant until `CLOUDFLARE_API_TOKEN` is set).

### Prod custom domain (badmintonduo.club)

Move nameservers Porkbun → Cloudflare (re-create existing DNS first so nothing
breaks), then Pages → `badmintonduo-prod` → Custom domains → add
`badmintonduo.club`.

### Per-project Supabase Auth config

Each project's Auth → URL Configuration must allow its own site:
- **Dev project:** Site URL `https://badmintonduo.pages.dev`, redirect URLs incl.
  `https://badmintonduo.pages.dev/**` and `http://localhost:5173/**`.
- **Prod project:** Site URL `https://badmintonduo.club`, redirect `https://badmintonduo.club/**`.

Edge Functions (e.g. `create-matchmaker`, `recompute-ratings`) deploy per project:
`supabase functions deploy <name>` with the right project linked.

## Workspace layout

```
apps/badminton    Vite SPA (React + TS) — the badminton app
packages/ui       Emerald Pro design system (tokens + primitives)
packages/domain   pure logic: match generation, ranking, fund math (+ tests)
packages/supabase typed Supabase client + generated types + auth helpers
supabase/         tracked SQL migrations + Edge Functions
docs/             ADRs, requirements, this runbook
```
