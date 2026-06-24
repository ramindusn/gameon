# Contributing

Thanks for helping with GameOn / BadmintonDuo! 🏸 Here's the short version. For the
full setup, build and deploy details see [`docs/RUNBOOK.md`](docs/RUNBOOK.md); for
the *why* behind the stack see the [ADR index](docs/adr/README.md).

## Setup

```bash
git clone https://github.com/ramindusn/gameon.git
cd gameon
npm install                                          # installs all workspaces
cp apps/badminton/.env.example apps/badminton/.env   # add your Supabase URL + publishable key
npm run dev                                           # http://localhost:5173
```

This is an **npm-workspaces monorepo**:

```
apps/badminton    the Vite + React + TS app
packages/ui       Emerald Pro design system (tokens + primitives)
packages/domain   pure logic: match generation, ranking, fund math (+ tests)
packages/supabase typed Supabase client + generated types + auth helpers
```

Tests run without a database (`VITE_E2E=1` bypass), so you only need `.env` to run
the app against real data.

## Tasks

This project tracks work with **[Backlog.md](https://backlog.md)**. Before starting,
search and read existing tasks with the CLI — don't edit task files by hand:

```bash
backlog task list --plain
backlog task view TASK-123 --plain
```

## Making a change

1. **Branch** off `main`:
   ```bash
   git switch -c feat/your-change
   ```
2. Make your change — keep it small and focused. Put pure logic in `packages/domain`
   with a unit test next to it.
3. **Run the gate** (must be green before you push):
   ```bash
   npm run lint && npm run build && npm test && npm run test:e2e
   ```
4. **Commit** with a [Conventional Commit](https://www.conventionalcommits.org) message:
   ```
   feat(generate): add fixed-pairs tournament draw
   fix(fund): correct rounding in member balances
   ```
5. **Push** your branch and **open a Pull Request** to `main`.

## What happens next

- **CI** (`.github/workflows/ci.yml`) runs automatically — lint, build, unit tests,
  and Playwright e2e. All must pass.
- Once green and approved, **merge** to `main`. The deploy workflow ships the build
  to **Cloudflare Pages** → https://badmintonduo.pages.dev (a one-time
  `CLOUDFLARE_API_TOKEN` secret activates it; until then deploy manually with
  `npm run deploy`).

## House rules

- **Never commit secrets.** `apps/badminton/.env` is git-ignored; only the
  `VITE_`-prefixed (publishable, RLS-guarded) values belong in client code. The
  Supabase secret key lives only as an Edge Function secret.
- **Match the surrounding style** — TypeScript (strict) + React + Tailwind (Emerald
  Pro tokens). No inline hex; use the theme tokens.
- **Database changes** are tracked SQL migrations in `supabase/migrations/`
  (RLS on every table); apply with `supabase db push`.
- Made an architectural call? Add an ADR in [`docs/adr/`](docs/adr/) and link it
  from the index.

## Handy commands

| Command | What |
|---|---|
| `npm run dev` | Dev server (apps/badminton) |
| `npm run lint` | ESLint |
| `npm run build` | Type-check (tsc) + production build |
| `npm test` | Unit / component tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run format` | Prettier write |
| `npm run deploy` | Build + deploy to Cloudflare Pages |

Questions? Ping Ramindu. 🏸
