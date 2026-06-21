# GameOn — product requirements (badminton app)

Authoritative spec for roles + information architecture. Supersedes earlier assumptions
(e.g. player nickname login is dropped — players do NOT log in).

Role name for the draw-creator: **Matchmaker**.

## Roles (3, distinct)
1. **Admin** — *standalone, login.* Club operations only: fund, shuttle inventory, budget
   (the dashboard at https://badmintonduo.club/). **Not** a player, **not** a Matchmaker.
2. **Matchmaker** — *login.* Is a **player** with extra powers: create/generate **draws** and
   **add players**. (Role name chosen: Matchmaker.)
3. **Player** — *no login.* Created by Matchmakers/Admin. Appears in rankings and has a public
   profile. Never authenticates.

> Two login types only: Admin and Matchmaker. Players are data, not accounts.

## Key concept
- **Draw** = one generated set of matches for a session, created by a Matchmaker.
  A draw's matches start as **scheduled**, then become **played** (with results), which feed
  the rankings.

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
- **Public site & profiles:** new epic — public home (schedule / played / leaderboard),
  player profile + history, profile search. Mostly read-only, RLS public-read.
- **Players (E02):** players are added by Matchmakers/Admin (no self-service signup).
- **Draws/Matches (E03/E04):** generator produces a draw → scheduled matches → played + results.
- **Rankings (E05):** two boards — doubles and individual.
- **Admin dashboard (E06):** the existing fund/inventory app, admin-only.
