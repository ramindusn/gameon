# Contributing

Thanks for helping with BadmintonDuo! 🏸 Get set up first with the
[README → Run it locally](README.md#run-it-locally) (it's `npm install` +
`npm install` + `npm run dev` — **no tokens, no setup**). This page is just the flow
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
5. **Push** and open a **Pull Request** to `main`. The PR template guides you.

## Branching & merging

**`main` is protected — never push to it directly. Everything goes through a PR.**

- Work on a short-lived **`feat/…` / `fix/…` branch** off `main`.
- Open a **PR** → it auto-requests **@ramindusn** (see `.github/CODEOWNERS`).
- A PR can merge only when **CI is green** (lint + build + unit + e2e) **and
  @ramindusn approves**.
- **Merge to `main` → auto-deploys to prod** (`badmintonduo.club`). No separate
  release step.

So the whole path is: `feat/x` → PR → green CI + review → **squash-merge** to `main` → prod.

> Enforcement of "no direct pushes / required CI + review" uses a GitHub **ruleset**
> on `main`, which needs the repo to be **public** or on **GitHub Pro** (it's locked
> on free private repos). Until then this is an honoured convention; the CODEOWNERS
> file still auto-requests the reviewer on every PR.

## Tests run for you

| When | Runs | How |
|---|---|---|
| each **commit** | lint + unit | git pre-commit hook (installed by `npm install`) |
| **`npm run deploy:dev`** | lint + unit + **e2e** | before publishing to the dev URL |
| **Pull Request** | lint + build + unit + **e2e** | CI (`.github/workflows/ci.yml`) |

So commits stay fast (lint + unit), and the full e2e suite runs before your change
hits the dev URL or gets merged. Run it yourself anytime with `npm run verify`
(needs `npx playwright install chromium` once). Skip the commit hook in a pinch
with `git commit --no-verify`.

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
