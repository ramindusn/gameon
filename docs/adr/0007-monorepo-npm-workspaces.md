# ADR 0007 — Monorepo tooling: npm workspaces (now)

**Status:** Accepted (2026-06)

## Context
GameOn is a monorepo (`apps/*` + `packages/*`) but starts with a single app. The
benefits of pnpm (speed/strictness) and Turborepo (task caching) mostly show at scale.

## Decision
Use **npm workspaces** now. Adopt **Turborepo** (additive — a dev dep + `turbo.json`,
no code changes) and optionally switch to **pnpm** (~10-min lockfile swap) when a second
app/sport lands.

## Consequences
- Zero extra tooling to start; a real monorepo (shared packages) regardless.
- Slower installs / no task caching until Turborepo is added — acceptable at one app.
- Low-friction to upgrade later.
