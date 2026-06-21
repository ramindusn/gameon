# ADR 0008 — Domain & DNS (badmintonduo.club via Cloudflare)

**Status:** Accepted (2026-06)

## Context
We own **badmintonduo.club** (registrar: Porkbun). The **current live app** (the fund
tracker) serves the apex via GitHub Pages and must not be disrupted. Cloudflare Pages
custom domains require the DNS zone to be on Cloudflare.

## Decision
- Develop GameOn on the free **`*.pages.dev`** URL.
- When ready to use the custom domain: move **nameservers Porkbun → Cloudflare**
  (registration stays at Porkbun), **re-creating the existing DNS records first** so the
  live apex keeps working, then attach GameOn to a **subdomain** (e.g.
  `play.badmintonduo.club`).
- Leave the **apex untouched** until GameOn reaches parity and we deliberately switch it.

## Consequences
- No disruption to the current live app during development.
- Cloudflare manages DNS once nameservers move.
- Future sports get their own subdomains/domains under the same setup.
