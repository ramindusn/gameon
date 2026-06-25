# Contributing

Thanks for helping with BadmintonDuo! 🏸 Get set up first with the
[README → Run it locally](README.md#run-it-locally) (it's `npm install` +
`cp .env.example .env` + `npm run dev` — **no tokens**). This page is just the flow
for making a change.

## The flow

```
local (dev DB)  →  optional dev-URL preview  →  PR  →  merge to main  →  prod
```

1. **Branch** off `main`: `git switch -c feat/your-change`.
2. **Build it.** `npm run dev` runs against the **dev** database the whole time, so
   localhost behaves exactly like https://badmintonduo.pages.dev. Put pure logic in
   `packages/domain` with a unit test next to it.
3. **(Optional) preview on the dev URL** — share it without touching `main`:
   ```bash
   npm run deploy:dev    # publishes YOUR branch to badmintonduo.pages.dev
   ```
   *(needs a one-time `npx wrangler login`; maintainers only.)*
4. **Commit** with a [Conventional Commit](https://www.conventionalcommits.org)
   message, e.g. `fix(fund): correct rounding in member balances`.
5. **Push** and open a **Pull Request** to `main`.

When CI is green and the PR is approved, **merge** — that auto-deploys to **prod**
(`badmintonduo.club`).

## Tests run for you (git hooks)

`npm install` wires up hooks, so you don't have to remember:

| When | Runs |
|---|---|
| each **commit** | lint + unit tests |
| each **push** | e2e (Playwright — run `npx playwright install chromium` once) |
| `npm run deploy:dev` | lint + unit + e2e, before publishing |

Skip in a pinch with `--no-verify` (don't, on shared branches).

## House rules

- **Never commit secrets.** Only `VITE_`-prefixed (publishable, RLS-guarded) values
  go in client code; `.env*` is git-ignored.
- **Match the surrounding style** — TypeScript (strict) + React + Tailwind (Emerald
  Pro tokens); use theme tokens, no inline hex.
- **DB changes** = SQL migrations in `supabase/migrations/` (RLS on every table).
- **Tasks** are tracked with [Backlog.md](https://backlog.md) — `backlog task list --plain`;
  don't hand-edit task files.
- Made an architectural call? Add an [ADR](docs/adr/).

Deploy, environments and DB details live in **[docs/RUNBOOK.md](docs/RUNBOOK.md)**.
Questions? Ping Ramindu. 🏸
