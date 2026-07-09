# ADR 0011 — Ranking model: Glicko-2 for individual + per-pair boards, with point-margin outcomes

**Status:** Accepted (2026-06)

## Context
GameOn shows **two leaderboards** (see [`../REQUIREMENTS.md`](../REQUIREMENTS.md)):
an **Individual** ranking and a **Doubles (pair)** ranking. All play is **doubles**:
each match is *you + partner* vs *two opponents*. We must derive a meaningful
rating for both an individual player and a specific partnership from these
matches.

Constraints shaping the choice:

- **Sparse, uneven play.** A club has few game days; players appear in wildly
  different numbers of matches, and partnerships change every draw. A rating
  system must express **confidence**, not just a point estimate, or newcomers and
  rarely-seen pairs distort the board.
- **Locked game days.** A game day is edited while open, then **submitted/locked**
  (E04). Locked days are immutable — a natural, replayable **rating-period**
  boundary.
- **No app server.** Ratings are maintained via Supabase (trigger / Edge Function)
  over a **pure, deterministic** calculation (see [ADR 0003](0003-backend-supabase-edge.md)),
  living in `packages/domain` so it is unit-testable in isolation.
- **Scores, not just winners.** Matches record **point scores** (e.g. 21–15), so a
  21–5 thrashing should move ratings more than a 21–19 nail-biter.

## Decision

### Rating system: **Glicko-2**, for both boards
We use **Glicko-2** (rating *r*, rating deviation *RD*, volatility *σ*; defaults
*r*=1500, *RD*=350, *σ*=0.06) rather than plain Elo. Glicko-2 carries an explicit
**uncertainty (RD)** that is large for new/rarely-seen entities and shrinks with
play — exactly what sparse club data needs. Elo's single number has no notion of
confidence and reacts poorly to few games.

Glicko-2 is a **rating-period** system: ratings update in **batches**, one batch
per period. We map **one locked game day = one rating period**, and recompute
**deterministically by replaying all locked game days in order**. Recompute-from-scratch
(rather than incremental mutation) keeps results reproducible and drift-free; at
club scale the cost is trivial.

### Two independent rating entities
- **Individual board** — every **player** has their own Glicko-2 state.
- **Doubles board** — every **unordered partnership `{p, q}`** has its own Glicko-2
  state (a "pair entity"). Pairs are sparse, so their RD stays high; Glicko-2
  represents that honestly rather than faking precision. (Per [the E05 question],
  the doubles board ranks **pairs**, not individuals re-shown.)

Both boards run the **same** Glicko-2 engine; they differ only in *what* is rated
and *who the opponent is*.

### Deriving the individual update from a doubles match
For a player in a doubles match, the opposing **team** is collapsed into a single
synthetic Glicko-2 opponent:

- **opponent rating** = **average of the two opponents' ratings** (team strength =
  mean of the pair);
- **opponent RD** = a combination of the two opponents' RDs (root-mean-square, so
  facing one provisional opponent keeps uncertainty high).

The match outcome is then applied to **each of the four players** against their
respective synthetic opponent. (We rate against the *team average* — option 1 —
not each opponent pairwise, which would over-weight a single match.)

For the **pair board**, the synthetic opponent is simply the **opposing pair's**
own rating/RD — a direct pair-vs-pair game.

### Point margin as the outcome score
Glicko-2's update accepts an outcome score **s ∈ [0, 1]**. Instead of a binary
win/loss (`1`/`0`), we use each side's **share of the points played**:

```
s_A = points_A / (points_A + points_B)
```

So 21–5 ≈ 0.81 and 21–19 ≈ 0.53: a bigger margin is a stronger result and moves
the rating more, while still summing to 1 across the two sides. This is a
documented, pragmatic extension of canonical Glicko-2 (which assumes
`s ∈ {0, 0.5, 1}`); the math is well-defined for any `s ∈ [0,1]` and suits a
points-based sport better than pure win/loss.

### Absence decay: active play is required to hold position (TASK-6.5; grace period TASK-36)
Glicko-2's built-in idle handling only **inflates RD** (rising uncertainty), which
leaves an inactive player's *rating* — and therefore their board position —
untouched. The product owner requires the opposite: a player who stops attending
should visibly **drift down** the board. We add an explicit **absence-decay**
penalty on top of (not replacing) the engine's idle-RD inflation.

Rules:

- **Attendance is historical, recorded per game day.** A `session_attendance`
  row (`session_id, player_id, present`) is **snapshotted once** by the recompute
  Edge Function for each finished session that lacks it: `present = true` for every
  player who appeared in a **played (scored) match** of that session, across the
  **club roster at snapshot time**. A game day can only be finished once every
  match is scored or deleted (TASK-10.5), so unplayed/deleted matches never make
  their players present. Rows are insert-if-missing, so attendance is **frozen** —
  players added later are never retroactively penalized for past days.
- **A 5-game-day grace period before any decay.** The club plays two game days a
  week, so a normal holiday or short injury shouldn't cost points. We track each
  player's run of **consecutive** missed game days: playing any scored match
  **resets** it, the first `ABSENCE_GRACE_PERIOD = 5` misses are **free**, and
  decay only begins on the **6th consecutive miss** (~3 weeks away).
- **−20 rating points per missed game day, once past the grace period**, applied
  to each **already-rated** absentee on the **individual board only** (pairs don't
  attend), *after* the period's normal Glicko-2 update. Floor at the **1500
  baseline**: decay pulls established (>1500) players back toward baseline but
  never below it, and never touches players already at or under 1500. Constants
  live in the pure engine (`ABSENCE_DECAY=20`, `ABSENCE_GRACE_PERIOD=5`,
  `ABSENCE_FLOOR=DEFAULT_RATING`) and are unit-tested.
- **Surfaced in the UI** as the lower rating itself plus an **"inactive" tag** on
  players absent from the **latest finished game day** (`loadInactivePlayers` reads
  `session_attendance.present = false` for that day). The tag explains the drop.

This keeps absence penalties **deterministic and replayable** (they fall out of the
same full-replay recompute) and distinct from idle-RD inflation, which still
applies on top.

## Consequences
- **Schema dependency: per-match point scores are required.** `match_results`
  currently stores only the winning **side**; that is insufficient for margin.
  E05 must add **`team_a_score` / `team_b_score`** to the match (owned by
  TASK-6.2/6.3) before ratings are meaningful. Until scores exist, a win/loss
  fallback (`s ∈ {0,1}`) is the degenerate case of the same formula.
- **Attendance store.** A `session_attendance` board (`session_id, player_id,
  club_id, present, recorded_at`; PK `(session_id, player_id)`) records who played
  each finished day. Public-read (the leaderboard derives the inactive set);
  writes are **service-role only** (the Edge Function snapshots it). Owned by
  TASK-6.5.
- **Two ratings stores.** A `player_ratings` board and a `pair_ratings` board
  (each: rating, rd, volatility, games, last period). Exact tables/RLS are owned
  by TASK-6.3; reads are public.
- **Recompute trigger.** A locked/submitted game day fires a recompute
  (trigger → Edge Function) that **replays all locked days** through the pure
  engine and overwrites both boards. Editing/reopening a day re-runs it. This is
  deterministic and idempotent.
- **Provisional handling.** Entities with high RD (few games) are **provisional**;
  the leaderboard UI (TASK-6.4) may flag them or hide entries below a games
  threshold so the top of the board reflects established players/pairs.
- **Pure & testable.** The calculation is a pure function in `packages/domain`
  (TASK-6.2) — no DB, no time, fully unit-tested with known Glicko-2 vectors.
- **Mixed doubles** uses the same model; gender affects *draw generation* (E03),
  not rating math.
