# ADR 0013 — Results-aware skill for matchmaking (manual skill kept as the seed)

**Status:** Accepted (2026-07). Builds on the ranking engine in
[ADR 0011](0011-ranking-glicko2.md) and the boards from
[ADR 0012](0012-tournaments-feed-main-boards.md).

## Context
Every player has a **manual skill (1–10)**, set by hand. The **match generator**
uses it to balance teams and tier players when making a draw. Separately, the
club has a **Glicko rating** (≈1500) computed from actual results (ADR 0011).

The manual skill never changed once set, so a player who turned out much stronger
or weaker than their initial label kept skewing draws. We want matchmaking to
reflect **how people actually play**, while keeping the manual number as a
**reference / starting point** (never overwritten).

## Decision
Introduce an **effective skill** the matchmaker uses, blending the manual seed
with a results-based skill, weighted by how many games the player has played:

```
effectiveSkill = w · skillFromRating(rating) + (1 − w) · manualSkill
w              = min(1, games / 8)            # results fully take over ~8 games
skillFromRating(r) = clamp(5.5 + (r − 1500) / 15, 1, 10)
```

- **New player (0 games)** → `w = 0` → uses the **manual seed**.
- **Regular player (≥ 8 games)** → `w = 1` → uses the **results-based** skill.
- **In between** → a smooth blend.

`skillFromRating` maps the Glicko rating onto the 1–10 scale: **1500 = 5.5**, and
every **15 rating points = 1 skill point** (a gentle slope — the club's ratings
are tightly clustered, so a bigger slope keeps the 1–10 spread meaningful; the
constant is tunable in `effectiveSkill.ts`).

- The manual `player_profiles.skill` column is **never written** — it stays the
  seed and reference. The effective skill is **computed on read** (no migration),
  in the generate flow and shown on the profile as `base → now`.

## How the ranking works, end to end
1. **Rating (results).** One locked game day = one Glicko-2 rating period; ratings
   replay from scratch over all finished sessions (casual + tournament). Outcome is
   **point-share**, so a 21–5 win moves more than a 21–19 (ADR 0011/0012).
2. **Confidence (RD).** Few games → high uncertainty → "Needs more games"; ratings
   swing more early and settle as you play.
3. **Absence decay.** Miss 5 consecutive game days (grace), then lose points per
   further missed day, floored at 1500 (TASK-36).
4. **Effective skill (this ADR).** For **matchmaking only**, the manual seed blends
   toward the rating-derived skill as games accumulate.

So: **rating drives the leaderboards; effective skill (seeded by the manual value)
drives balanced draws.**

## Consequences
- Draws get fairer over time without anyone re-labelling skills by hand.
- The manual skill still matters most for newcomers and remains an editable seed.
- The rating→skill slope and the 8-game takeover are single constants, easy to
  tune if the club wants results to weigh more or less.
- No schema change; nothing to recompute — it's a read-time calculation.

See TASK-44.
