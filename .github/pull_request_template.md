## What & why
<!-- What does this PR change, and why? Keep it short. -->

## Checklist
- [ ] Gate is green locally: `npm run verify` (lint + unit + e2e)
- [ ] No secrets committed — only `VITE_`-safe (publishable, RLS-guarded) values in client code
- [ ] Tracked with a Backlog task if this is committed work (`backlog task list --plain`)
- [ ] Added/updated an ADR (`docs/adr/`) if a convention or architectural decision changed

<!--
CI (lint + build + unit + e2e) must pass and @ramindusn (code owner) must approve
before this merges to `main`. Merging to `main` deploys to prod (badmintonduo.club).
-->
