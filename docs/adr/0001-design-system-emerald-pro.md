# ADR 0001 — Design system: Emerald Pro

**Status:** Accepted (2026-06)

## Context
We explored 10 minimalist directions in Stitch (web + mobile), shortlisted 3, and
rendered the real screens (public home + player profile) in each. We needed one locked
design system for GameOn before building `packages/ui`.

## Decision
Adopt **Emerald Pro**: a dark, premium "pro-stats" look — deep graphite surfaces, a
single emerald accent, near-white text, high-contrast numerics. Best fit for an
evening, data-forward club app; scales cleanly web↔mobile.

### Canonical inputs (Stitch design system)
- **Color mode:** dark
- **Seed / primary accent:** `#10B981` (emerald), dynamic variant: tonal-spot
- **Headline font:** Manrope · **Body/UI font:** Inter
- **Roundness:** 8px base

### Provisional tokens (finalize by sampling the locked renders in TASK-1.5)
| Token | Value (approx) |
|---|---|
| `--bg` (graphite) | `#0B1220` |
| `--surface` | `#131C2B` |
| `--surface-muted` | `#1B2536` |
| `--line` (border) | `#243044` |
| `--fg` | `#E8EDF4` |
| `--fg-muted` | `#94A3B8` |
| `--accent` | `#10B981` |
| `--accent-strong` | `#34D399` |
| positive / negative / warning | `#10B981` / `#F43F5E` / `#F59E0B` |
| radius | 8px (cards 12–16px) |
| fonts | Manrope (headings), Inter (body/UI) |

A **light variant** will be derived from the same tokens (CSS variables flipped) so
the app can support light + dark.

## Consequences
- `packages/ui` is built from these tokens (TASK-1.5): CSS-variable semantic tokens +
  primitives (Button/Card/Field/Modal + dual-render list), Manrope + Inter.
- All feature screens follow this system; the other explored directions are dropped.
