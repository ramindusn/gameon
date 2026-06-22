# ADR 0009 — Styling: Tailwind CSS + CSS-variable tokens

**Status:** Accepted (2026-06)

## Context
TASK-1.5 builds the Emerald Pro design system into `packages/ui`. We need a styling
approach that's productive for the dual-render (mobile-card/desktop-table) UI and that
flips light/dark from one source.

## Decision
Use **Tailwind CSS v3** with **CSS-variable semantic tokens**. Tokens (`--bg`,
`--surface`, `--line`, `--fg`, `--accent`, …) are defined once in
`packages/ui/src/theme.css` (`:root` = light, `.dark` = dark) and mapped into Tailwind's
theme as `bg-surface`, `text-fg`, `border-line`, `bg-accent`, etc. Emerald Pro (dark) is
the default (`<html class="dark">`); the light variant is the same tokens flipped.

## Consequences
- One token source drives both themes; components use semantic utilities, never raw hex.
- Tailwind scans `apps/**` + `packages/ui/**`; `packages/ui` ships components + `theme.css`.
- Fonts: Manrope (headings, `font-display`) + Inter (body, `font-sans`).
- A theme toggle (later) just flips the `.dark` class.
