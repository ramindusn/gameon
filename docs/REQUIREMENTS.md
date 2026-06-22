# GameOn — product requirements (badminton app)

Authoritative spec for roles + information architecture. Supersedes earlier assumptions
(e.g. player nickname login is dropped — players do NOT log in).

Role name for the draw-creator: **Matchmaker**.

## Roles (3, distinct)
1. **Admin** — *standalone, login (magic link).* Club operations only: fund, shuttle inventory,
   budget. **Not a player, not a Matchmaker.** Additionally, **Admins create Matchmaker
   accounts** — each with a **name/username + password**.
2. **Matchmaker** — *login (username + password).* **Is a player** with extra powers: create a
   **game day / schedule**, **add players**, and **edit match scores on game days they created**.
3. **Player** — *no login.* Created by Matchmakers/Admin. Appears in rankings and has a public
   profile. Never authenticates.

> Two login types only: Admin (magic link) and Matchmaker (username + password). Players are
> data, not accounts. Admins are **not** players; Matchmakers **are** players.

## Key concepts
- **Matches are always doubles.** No singles. The generator pairs players into 2-a-side
  matches.
- **Mixed doubles.** Each **player has a gender** (male / female / other). The generator can
  produce **mixed-doubles** fixtures (one male + one female per pair) alongside regular doubles.
- **Draw** = one generated set of (doubles) matches for a session, created by a Matchmaker.
  A draw's matches start as **scheduled**, then become **played** (with results), which feed
  the rankings.
- **Game day (session)** — created by a Matchmaker.
  - **Name** defaults to the **game-day start date**; the Matchmaker can rename it to anything.
  - While **open**, the creating Matchmaker can edit match scores.
  - Once **submitted / completed**, the game day is **locked** — scores can no longer be edited.

## Public home (logged-out — the default view)
- **Top bar:** two buttons — **Admin login** and **Matchmaker login**.
- **Sections, in order:**
  1. **Scheduled matches** (upcoming, from current draws)
  2. **Already-played matches** (results / history)
  3. **Leaderboard** — **Doubles rankings** + **Individual rankings**
- **Empty state:** if **no draws exist**, show **only the Leaderboard** (both doubles + individual).
- **Profiles:** tap any player → **public profile** = individual performance + match history.
  A **search** lets anyone find a profile. (All public, no login.)

## Per-role areas
- **Admin** → club-ops dashboard (fund/shuttle/budget), as today on badmintonduo.club.
- **Matchmaker** → generate draws (balanced matches), manage/add players, run a session
  (record results). Also sees everything a public visitor sees.
- **Player** → nothing to log into; they are viewed via the public profile + rankings.

## Implications for the plan
- **Auth (E01):** two flows — Admin login + Matchmaker login. **Remove player nickname/password.**
  **Admins create Matchmaker accounts** (username + password) via a privileged Edge Function
  (service role; ADR 0003) — no self-service signup.
- **Game days (E03/E04):** a session/game-day carries a **name** (defaults to start date,
  renamable) and a **state** (open → submitted/completed). Score editing is allowed only on
  **open** game days and only for the **creating Matchmaker**; locked once completed.
- **Public site & profiles:** new epic — public home (schedule / played / leaderboard),
  player profile + history, profile search. Mostly read-only, RLS public-read.
- **Players (E02):** players are added by Matchmakers/Admin (no self-service signup).
- **Draws/Matches (E03/E04):** generator produces a draw → scheduled matches → played + results.
  **Doubles only**; supports **mixed doubles** using each player's **gender**.
- **Rankings (E05):** two boards — doubles and individual.
- **Admin dashboard (E06):** the existing fund/inventory app, admin-only.
