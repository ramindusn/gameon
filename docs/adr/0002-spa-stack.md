# ADR 0002 — Frontend stack: Vite + React + TypeScript (SPA)

**Status:** Accepted (2026-06)

## Context
GameOn is mostly login-gated (Admin/Matchmaker areas); only the public home/profiles
are anonymous, and those don't need SSR-grade SEO. We weighed a **Vite SPA** (simple,
already familiar) against **Next.js** (SSR, routing, API routes). Next.js's headline
wins (SSR/SEO) add little here, and it's heavier to learn/operate.

## Decision
Build the app as a **Vite + React + TypeScript single-page app**.

## Consequences
- Simplest setup, fast HMR, deploys as a static bundle (fits Cloudflare Pages — ADR 0004).
- No SSR/SEO; the small public surface is fine as client-rendered.
- Privileged server logic lives in **Supabase Edge Functions** (ADR 0003), not an app server.
- If we ever need SSR, we can introduce Next.js later; the UI/domain/data code ports.
