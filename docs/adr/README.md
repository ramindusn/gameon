# Architecture Decision Records

Short records of significant decisions: context, decision, consequences.

| # | Decision |
|---|----------|
| [0001](0001-design-system-emerald-pro.md) | Design system: **Emerald Pro** (dark, emerald, Manrope + Inter) |
| [0002](0002-spa-stack.md) | Frontend: **Vite + React + TS** SPA (not Next.js) |
| [0003](0003-backend-supabase-edge.md) | Backend: **client Supabase + RLS**, Edge Functions for privileged ops |
| [0004](0004-hosting-cloudflare-pages.md) | Hosting: **Cloudflare Pages** |
| [0005](0005-multi-tenant-schema.md) | **Multi-tenant-ready** schema (single club to start) |
| [0006](0006-data-layer-tanstack-query.md) | Data layer: **TanStack Query** |
| [0007](0007-monorepo-npm-workspaces.md) | Monorepo: **npm workspaces** now |
| [0008](0008-domain-subdomain.md) | Domain/DNS: **badmintonduo.club via Cloudflare**, subdomain for GameOn |
| [0010](0010-auth-model-magic-link.md) | Auth: **Admin magic-link**, **Matchmaker username+password**, players don't log in |
| [0011](0011-ranking-glicko2.md) | Ranking: **Glicko-2** for **individual + per-pair** boards, **point-margin** outcomes |

Roles + information architecture live in [`../REQUIREMENTS.md`](../REQUIREMENTS.md).
