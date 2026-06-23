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

## Deploy (Cloudflare Pages)

Hosting is Cloudflare Pages ([ADR 0004](adr/0004-hosting-cloudflare-pages.md)).
Develop on the free `*.pages.dev` URL; the custom domain
(`play.badmintonduo.club`) is attached later, leaving the apex untouched
([ADR 0008](adr/0008-domain-subdomain.md)). SPA deep links are handled by
`apps/badminton/public/_redirects` (`/* /index.html 200`), which the build copies
into `dist/`.

### Option A — direct upload (fastest first deploy)

```bash
npx wrangler login            # one-time browser auth to your Cloudflare account
npm run deploy                # builds, then wrangler pages deploy → badmintonduo.pages.dev
```

`npm run deploy` runs `wrangler pages deploy apps/badminton/dist --project-name=badmintonduo`
(creates the project on first run). The build bakes in `apps/badminton/.env`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).

### Option B — Git integration (CI on every push)

In the Cloudflare dashboard → Pages → Connect to Git, pick this repo and set:
- **Build command:** `npm run build` · **Output directory:** `apps/badminton/dist`
- **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

### Custom domain (later)

Move nameservers Porkbun → Cloudflare (re-create existing DNS first so the live
apex keeps working), then Pages → Custom domains → add `play.badmintonduo.club`.
Leave the apex pointing at the current site until GameOn is ready to switch.

Edge Functions (privileged ops, e.g. `create-matchmaker`, `recompute-ratings`)
deploy to Supabase, not Cloudflare: `supabase functions deploy <name>` with
secrets via `supabase secrets set`.

## Workspace layout

```
apps/badminton    Vite SPA (React + TS) — the badminton app
packages/ui       Emerald Pro design system (tokens + primitives)
packages/domain   pure logic: match generation, ranking, fund math (+ tests)
packages/supabase typed Supabase client + generated types + auth helpers
supabase/         tracked SQL migrations + Edge Functions
docs/             ADRs, requirements, this runbook
```
