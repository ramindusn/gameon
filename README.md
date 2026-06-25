# GameOn / BadmintonDuo

Badminton club platform — draws, live scoring, leaderboards, club fund. Vite + React
SPA on Cloudflare Pages, Supabase (Postgres + Auth + RLS) backend, npm-workspaces
monorepo.

## Run it locally

> **Run every command from the repo root (`gameon/`)** — the folder with the
> top-level `package.json`. This is a monorepo: the root scripts delegate into
> `apps/badminton` for you, so **don't `cd apps/badminton`**. In your IDE, open the
> **`gameon` root** folder; in WebStorm run the `dev` script from the **root**
> `package.json` (not a sub-package) and make sure its Node interpreter is **20+**.

**No tokens, no setup** — the dev config (`apps/badminton/.env`) is committed (the
publishable key is public; RLS guards the data), so this just works:

```bash
git clone <repo-url> gameon
cd gameon            # ← run everything below from here (repo root)
npm install
npm run dev          # http://localhost:5173
```

Your local app now talks to the same backend as **https://badmintonduo.pages.dev**.
Run the tests anytime (same place, the repo root — no database needed, they use a bypass):

```bash
npm test            # unit / component
npm run test:e2e    # end-to-end (Playwright; run `npx playwright install chromium` once)
```

## Do I need any tokens / passwords?

| What you're doing | What you need |
|---|---|
| **Run locally / run tests** | **Nothing** — the committed dev key is public (RLS guards the data) |
| Publish your branch to the dev URL (`npm run deploy:dev`) | Cloudflare login (`npx wrangler login`) — maintainers only |
| DB migrations / Edge Functions | Supabase CLI link + DB password — maintainers only |
| CI auto-deploy to prod on merge | GitHub repo secrets — set once by a maintainer |

So: **contributors need zero secrets.** Tokens only matter for deploying or admin DB ops.

## Where things go

```
apps/badminton    the app (Vite + React + TS)
packages/ui       design system (Emerald Pro tokens + primitives)
packages/domain   pure logic: match generation, ranking, fund math (+ tests)
packages/supabase typed Supabase client + generated types + auth helpers
supabase/         SQL migrations (RLS on every table) + Edge Functions
docs/             ADRs, requirements
```

## Docs (each has one job)

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — how to make a change: branch → test → PR → merge.
- **[docs/RUNBOOK.md](docs/RUNBOOK.md)** — *maintainers:* environments, deploy, DB, domain.
- **[ADR index](docs/adr/README.md)** — why the stack is the way it is.
