# ADR 0010 — Auth model: Admin magic-link, Matchmaker username+password, no player auth

**Status:** Accepted (2026-06)

## Context
GameOn has exactly **two login types** and one non-authenticating actor
(see [`../REQUIREMENTS.md`](../REQUIREMENTS.md)):

- **Admin** — club-ops only (fund/shuttle/budget). Not a player.
- **Matchmaker** — a player with extra powers (generate draws, add players).
- **Player** — *data, not an account.* Created by Matchmakers/Admin. Never logs in.
  (The earlier player nickname/password idea is dropped.)

Both login sets are small and trusted. We run no app server
(see [ADR 0003](0003-backend-supabase-edge.md)).

## Decision
Two distinct mechanisms, both on **Supabase Auth**:

- **Admin → email magic link (passwordless OTP).** Rare, single-operator club-ops login;
  no password to store or reset. Sends a link to the Admin's email.
- **Matchmaker → username + password.** Matchmakers sign in at courtside, often without
  inbox access, so a memorable **handle + password** beats a magic link. The username is
  the credential of record; **no real email is required**.

### Making username work on Supabase Auth
Supabase's password provider is keyed on email, so a Matchmaker account is created with a
**synthetic email** derived from the handle (e.g. `<username>@matchmaker.gameon.local`).
The login UI takes `username` + `password`, maps it to that synthetic email, and calls
`signInWithPassword`. Users never see the synthetic email. The chosen username is stored
on the Matchmaker's profile and must be unique (detail in TASK-2.2 / TASK-2.3).

### Role resolution
**Role is resolved server-side from the database, never from the login button.** A
signed-in user maps to a role via their admin/profile record; **RLS policies — not the
UI — enforce permissions.** Players have **no `auth.users` row**; they exist only as
roster rows. E2E tests bypass both flows via the existing `VITE_E2E` flag.

## Consequences
- Two auth paths to build instead of one, but each fits its user: low-friction passwordless
  for the lone Admin, no-email repeat login for Matchmakers.
- Synthetic emails mean Matchmaker accounts can't receive password-reset emails; resets are
  an Admin/Matchmaker-with-powers operation (re-issue credentials), handled in E01.
- Usernames must be enforced unique and reserved (no collisions with the synthetic-email
  domain). Password rules (min length, hashing) are owned by Supabase Auth.
- Adding/removing a login is a data change (create the account + role grant), not a code
  change.
