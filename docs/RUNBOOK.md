# Runbook — environments, deploy & DB (maintainers)

> **Just want to run the app or contribute?** See the
> [README](../README.md#run-it-locally) and [CONTRIBUTING](../CONTRIBUTING.md).
> This guide is for **maintainers** doing deploys, migrations, and infra.

For the *why* behind the stack, see the [ADR index](adr/README.md); for roles and
product rules, see [REQUIREMENTS.md](REQUIREMENTS.md).

> **Run every command below from the repo root (`gameon/`)** — `npm`, `wrangler`,
> and `supabase` all expect it (the `supabase/` config and the workspace scripts
> live there). Never `cd` into `apps/badminton`.

## Database migrations

Tracked SQL under `supabase/migrations/` (RLS on every table). Apply to a linked
project:

```bash
supabase link --project-ref <ref>     # dev or prod ref
supabase db push
```

The app reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (publishable
key is safe to ship — RLS is the guard). The secret key is server-only and lives
as a Supabase Edge Function secret, never in the app.

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
