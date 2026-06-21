# ADR 0004 — Hosting: Cloudflare Pages

**Status:** Accepted (2026-06)

## Context
Priority: stay on a free tier for years with no card surprises and no inactivity
pausing. Compared **Vercel** (Hobby = non-commercial only, 100 GB bandwidth, pauses
the deploy on overage), **Cloudflare Pages** (unlimited bandwidth, private repos),
**GitHub Pages** (100 GB soft cap, public repo only).

## Decision
Host the static SPA on **Cloudflare Pages**.

## Consequences
- Unlimited bandwidth, no pause, no commercial-use clause, private repo OK — most
  free-tier-durable option.
- Static-only host; the "backend" is Supabase + Edge Functions (ADR 0003).
- DNS/domain managed via Cloudflare (ADR 0008).
